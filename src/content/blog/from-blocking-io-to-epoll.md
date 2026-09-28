---
title: "From Blocking I/O to epoll: Scaling a Single-Threaded C++ HTTP Server"
date: "2026-09-28"
description: "How non-blocking sockets and epoll helped my single-threaded C++ HTTP server handle more concurrent connections, measured through throughput, latency, and errors."
relatedProjects: ["http-server"]
---

In my last post, I talked about optimizing the HTTP parser used in my server. This time, I focused on how the server handles concurrent connections. Even a fast parser cannot help other clients while the only server thread is blocked waiting for one of them.

The networking layer of my server uses POSIX sockets. On Linux, sockets share the file descriptor abstraction used for files and pipes. Understanding that abstraction helped me see how one thread could manage many connections.

To understand why this matters for performance, it helps to first understand how Linux represents these resources.

## Processes and File Descriptors

A process is one of the fundamental abstractions the operating system uses to manage a running program. Each process has its own virtual address space and a collection of resources managed by the kernel.

A process refers to many of its I/O resources using integer identifiers called **file descriptors**.

When a program opens a file or creates a socket, the kernel returns a file descriptor that the process can use to refer to that resource in later system calls. File descriptor numbers are local to a process, so file descriptor `5` in one process has no necessary relationship to file descriptor `5` in another.

For a network server, every accepted client connection is represented by a socket file descriptor. A server with thousands of simultaneous connections may therefore have thousands of file descriptors open at the same time.

Managing all of that I/O efficiently becomes increasingly important as the number of connections grows.

## The Problem With Blocking I/O

Sockets are blocking by default.

Suppose a server calls `recv()` on a client socket, but that client has not sent any data yet. With a blocking socket, the calling thread can be put to sleep until data becomes available.

For a multithreaded server, another thread may still be able to process other connections. My server, however, was intentionally still single-threaded at this stage of development.

If my only server thread blocks waiting for one connection, it cannot spend that time processing another connection that may already be ready.

One solution is to avoid blocking and instead determine which connections are actually ready before trying to perform I/O on them. The problem then becomes finding those connections efficiently.

## Finding Ready Connections

A simple approach is to repeatedly examine all of the connections and ask whether each one is ready.

That may not be a major problem with a small number of connections. With thousands of connections, however, repeatedly examining descriptors that have nothing to do becomes increasingly wasteful.

Imagine having 10,000 open connections while only 20 currently have data waiting to be processed. Ideally, the server should spend its time processing those 20 connections rather than repeatedly examining all 10,000.

This is the problem `epoll` is designed to address on Linux.

## What Is `epoll`?

`epoll` is Linux's interface for monitoring large numbers of file descriptors for I/O readiness.

A program first creates an epoll instance with `epoll_create1()`. File descriptors are then registered with that instance using `epoll_ctl()`, along with the events the program is interested in, such as whether a socket is ready to be read from.

The server can then call `epoll_wait()` and provide an array where the kernel can report ready events.

`epoll_wait()` returns a batch of ready events, so the application can work on those connections without scanning every registered descriptor. If no events are ready, it can wait for activity across the monitored connections. The [Linux epoll manual](https://man7.org/linux/man-pages/man7/epoll.7.html) describes this as an interest list and a ready list maintained by the kernel.

This changes the problem from roughly:

> "Which of my thousands of connections can I work on?"

to:

> "Give me the connections that currently have work for me."

That distinction becomes increasingly important as the number of simultaneous connections grows.

## Non-Blocking Sockets

Using `epoll` effectively also requires thinking differently about the sockets themselves.

I converted my server's sockets to **non-blocking I/O**.

With a non-blocking socket, an operation that cannot currently make progress does not put the thread to sleep waiting for it. Instead, the system call returns and indicates that the operation would block, typically through `EAGAIN` or `EWOULDBLOCK`.

The server can then return to its event loop and work on another connection.

This combination of `epoll` and non-blocking sockets allows a single thread to multiplex I/O across a large number of simultaneous connections.

That leads to the question I wanted to answer experimentally:

**How much more scalable is the server after replacing its blocking I/O architecture with non-blocking sockets and `epoll`?**

To test this, I benchmarked both versions of the server using `wrk`, gradually increasing the requested connection count while keeping both implementations single-threaded.

## Benchmark Setup

I ran five 30-second measurements at each requested connection count, from 1 to 20,000, using the same script for both versions. `wrk` used four client threads except where the requested connection count was smaller; it used a 2-second timeout and a 5-second warm-up before each group of runs. The server and `wrk` ran on the same laptop over loopback (`http://127.0.0.1:8080/`). There was a 2-second cooldown between measured runs at each connection setting. The graphs plot the average of the five runs at each point. For throughput, the error bars show one standard deviation between runs.

The benchmark machine was a ThinkPad L15 Gen 2a running Arch Linux x86_64, with an AMD Ryzen 7 PRO 5850U (16 logical CPUs), 61.63 GiB of usable RAM, and Linux kernel `7.2.6-arch2-1`. The CPU and kernel match the saved benchmark environment; the laptop model and RAM total come from a later fastfetch check.

Every request included `Connection: close`, so the client opened and closed connections repeatedly instead of reusing persistent HTTP connections. The test therefore stresses connection acceptance and teardown as well as request processing. A `wrk -c` value is a requested concurrency setting, not proof that the server held exactly that many established connections throughout a run. When the requested count is not divisible by the client thread count, `wrk` assigns each thread an integer share, so the total can be slightly lower than requested. Throughout this post, connection counts refer to the requested `-c` setting; the graph positions are evenly spaced test settings, not a linear connection-count scale.

Both versions served the same workload with one server thread. The main architectural change was moving from blocking connection handling to non-blocking sockets and `epoll`. This comparison also includes the state management required by the new implementation, so it measures the complete versions of my server rather than the cost of the `epoll` calls in isolation.

The published [benchmark script](/blog/epoll/run_wrk.sh) is identical in both result folders. Its metadata collection has been cleaned up for publication; the workload and result parser are unchanged. The recorded data and environment details are available here:

| Implementation | Results | Environment | Example raw run |
|---|---|---|---|
| Blocking | [CSV summary](/blog/epoll/blocking_wrk/summary.csv) | [Environment](/blog/epoll/blocking_wrk/environment.txt) | [10,000 connections, run 1](/blog/epoll/blocking_wrk/connections_10000_run_1.txt) |
| epoll | [CSV summary](/blog/epoll/epoll_wrk/summary.csv) | [Environment](/blog/epoll/epoll_wrk/environment.txt) | [10,000 connections, run 1](/blog/epoll/epoll_wrk/connections_10000_run_1.txt) |

[Download all benchmark results (ZIP)](/blog/epoll/wrk-results.zip), including both implementations’ raw logs, CSV summaries, environment records, and copies of the benchmark script.

Each CSV lists the raw log filename for every measurement; those files sit alongside the CSV. The published environment records omit machine identifiers and Git metadata. The exact server source snapshots used for these runs are not included.

The high connection counts brought up a practical problem before I could even interpret the results: file descriptor limits.

### File Descriptors and the Listen Backlog

While investigating problems with the benchmark, I checked `ulimit -n` and found a soft limit of **2,048 open file descriptors** in my shell. That limit matters for high concurrency tests, but it does not by itself explain the problems I saw even at one requested connection.

Each open socket uses a descriptor, so both the server and `wrk` need limits sufficient for the sockets they actually hold. Processes normally inherit the shell's limit when launched from it. I adjusted the limits for the benchmark sessions so the requested connection counts could be attempted. Both `environment.txt` files record a benchmark-shell limit of **65,536 descriptors**. The server was already running when the script started, so these records do not independently confirm its effective limit or the number of established sockets.

I also checked `/proc/sys/net/core/somaxconn`, which was **4,096** on my machine. This is a different limit: it caps the backlog requested by `listen()`, the queue of established connections waiting for the application to accept them, as described in the [Linux listen manual](https://man7.org/linux/man-pages/man2/listen.2.html). It does **not** cap the total number of established connections a server may hold. The process's open descriptor limit and the listen backlog matter at different stages, and increasing one does not substitute for increasing the other.

Those settings are part of the experimental setup. They also reminded me that a server's performance depends on how its application code and operating system limits fit together.

## Throughput: How Does the Request Rate Change With Concurrency?

![Requests per second versus concurrent connections for the blocking and epoll servers](/blog/epoll/throughput-vs-connections.png)

*A × marks a connection setting where at least one of the five runs reported errors.*

The blocking server's throughput rose to about **32,900 requests per second at 250 connections**. It remained near **30,300 requests per second at 2,500 connections**, but it had stopped gaining throughput as more clients were added. At **5,000 connections**, its average dropped to about **9,700 requests per second**, and every run at that connection count reported errors.

The `epoll` version reached about **42,600 requests per second at 250 connections**. More interestingly, it still averaged about **38,200 at 5,000** and **37,800 at 10,000 connections**, with no errors reported in those runs. At 10,000 connections, that is roughly **7.9 times** the blocking version's measured request rate, though the blocking workload was already failing, so that ratio should not be read as a clean speedup on successfully served traffic.

At **20,000 connections**, the `epoll` version also dropped sharply, to about **9,300 requests per second**. Four of its five runs reported errors. The graph shows a wider range of useful concurrency for this implementation, not unlimited capacity.

## p99 Latency: What Happens to the Slow Requests?

![Average reported p99 latency versus concurrent connections for the blocking and epoll servers](/blog/epoll/p99-latency-vs-connections.png)

*A × marks a connection setting where at least one of the five runs reported errors.*

The **99th percentile latency**, or p99, describes the slow end of the reported latency distribution: about 99% of observations fall at or below it. Each point averages the p99 values reported by five runs; it is not a single p99 calculated from all five runs combined.

At **2,500 connections**, the blocking version's average reported p99 was about **158 ms**, compared with about **67 ms** for `epoll`. At **10,000 connections**, `epoll`'s p99 was about **267 ms** while its throughput was still near 38,000 requests per second and its runs reported no errors.

This rise matters. `epoll` helps a single thread find ready connections, but that thread still has finite processing capacity. As concurrency grows, requests can spend more time waiting for service even while the server maintains a similar total request rate. The benchmark alone does not tell me exactly how much of the delay came from the server, the load generator, or the operating system.

At **20,000 connections**, `epoll`'s average reported p99 reached about **1.83 seconds**, alongside falling throughput and errors in four of five runs. At this setting, its reported p99 was higher than the blocking version's roughly **1.3 seconds**. That does not establish that the blocking server handled the workload better: both versions reported errors, and their latency statistics do not capture the full experience of failed requests. The error data must be read alongside this graph.

## Timeouts: Where Do the Tests Start Failing?

![Average timeout count per run versus concurrent connections for the blocking and epoll servers](/blog/epoll/timeouts-vs-connections.png)

*Bars average five runs per connection count and show timeouts only, not other socket errors.*

The blocking version reported no timeouts through **2,500 connections**. At **5,000**, it recorded **33,014 timeouts across five runs**, or about **6,603 per run**. It continued to report timeouts at 10,000 and 20,000 connections.

The `epoll` version reported no timeouts through **10,000 connections**. At **20,000**, it recorded **3,342 timeouts across five runs**, or about **668 per run**, with four runs marked as having errors. These counts are not a percentage of attempted requests, and the timeout graph excludes other error types. Still, it makes the difference in the tested failure points clear: the first tested setting with reported errors was 5,000 for the blocking version and 20,000 for `epoll`. These are sampled settings, not exact failure thresholds.

I cannot tell from these results alone why the `epoll` test deteriorated at 20,000. The single server thread may have been saturated; `wrk` and the server were also competing for resources on the same laptop. Because requests closed their connections, connection setup and teardown, the listen backlog, and client-side socket or port limits could also matter. Pinning down the cause would require another experiment with measurements such as CPU usage for both processes, open descriptor counts, socket states, and connection and socket errors.

## What I Learned

Moving to non-blocking sockets and `epoll` changed how my single server thread managed concurrent connections. The result was visible in all three measurements: the server sustained useful throughput over a much larger tested connection range, its reported p99 was lower at the tested settings from 10 through 10,000 requested connections, and errors first appeared at a higher tested setting.

This experiment also showed me why I need to read throughput, latency, and errors together. A server can maintain its request rate while individual requests wait longer. Once timeouts appear, the reported latency no longer tells the whole story.

My next step is adding multithreading. That will give me another comparison: how much additional work can the server do when its event-driven I/O architecture can use more than one core? For now, the important result is that moving to an event-driven implementation made a substantial difference in this workload while the server remained single-threaded.
