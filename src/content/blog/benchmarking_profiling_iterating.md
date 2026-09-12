---
title: "Benchmarking, Profiling, Iterating: The Lifecycle of Performance"
date: "2026-09-12"
description: "http-server"
relatedProjects: ["http-server"]
---

*Optimizing a Modern C++ HTTP Parser with `perf`*

## Preface

The analysis and optimization in this post happened in the HTTP server project I have been building. I chose this as my first serious, long-term project for two reasons.

First, it is a good way to exercise the modern C++ I have been studying in my free time. Second, I wanted to learn the process of optimizing software.

HTTP servers are mature, well-understood pieces of software with decades of documentation and resources surrounding them. This is especially useful when researching the different layers involved, from HTTP request formatting to POSIX sockets and operating-system behavior.

Because the problem space is so well documented, I can focus less on inventing the system itself and more on understanding how each layer works, measuring its behavior, and learning how to improve it.

## Establishing a Baseline

I chose to focus the initial benchmarking effort on the request parser because, in the current version of the server, it is by far the most complex and computationally demanding component. The networking layer mostly wraps relatively direct POSIX socket operations, while the parser has to maintain state across calls, identify request boundaries, validate syntax, process headers, handle request bodies, and correctly deal with input arriving in arbitrary fragments. It also performs much more string and memory manipulation than the other parts of the server.

Because of that, the parser seemed like the most useful place to establish a performance baseline and look for optimization opportunities.

To begin, I implemented my own benchmarking suite focused on specific parser workloads and used `std::chrono::steady_clock` to measure their execution time.

Rather than benchmarking only a single ideal request, I created several workloads designed to exercise different behaviors of the parser. An HTTP request may arrive all at once, in several fragments, or even one byte at a time depending on how data is delivered over the network. Requests can also vary significantly in size and structure.

The benchmark suite included the following cases:

| Benchmark | Purpose |
|---|---|
| `lifecycle` | Measures the full lifecycle of creating, using, and resetting a parser. |
| `complete_request` | Feeds a normal HTTP request to the parser in a single operation. |
| `fragmented_request` | Splits a request across multiple calls to `consume()`, simulating data arriving in several chunks. |
| `byte_by_byte_request` | Feeds the request to the parser one byte at a time, representing an intentionally extreme fragmentation case. |
| `malformed_request` | Measures how quickly the parser recognizes and rejects invalid input. |
| `request_with_body` | Exercises parsing when the request contains a body rather than only headers. |
| `many_headers` | Tests the cost of processing a request containing a larger number of HTTP headers. |
| `large_body` | Tests the parser with a significantly larger request body. |
| `fragmented_body` | Combines a larger request body with incremental delivery of that body. |
| `long_target` | Tests a request containing a much longer request target than the typical case. |

I was not trying to reproduce every possible HTTP request. The purpose of these benchmarks was to create a small collection of workloads that stressed different behaviors in the parser.

The fragmentation benchmarks were especially important because the parser is incremental. It needs to preserve its state when only part of a request is available and continue parsing once more data arrives.

For the final comparison, I ran each workload for 10,000 iterations per sample and collected 20 samples. I used the same configuration for the original parser and the optimized parser so that the results could be compared directly. I also collected two independent runs of each implementation rather than relying on a single execution.

From those samples, the harness calculated the mean, median, minimum, maximum, standard deviation, 95th and 99th percentiles, and operations per second. Looking at more than a single average was especially useful because some workloads contained occasional outliers that noticeably affected the mean.

I could have used an existing C++ benchmarking library, but part of the purpose of this project is understanding the tooling surrounding systems software rather than treating it as a black box. Building the small benchmark harness myself gave me experience with timing, repeated sampling, basic statistics, and storing benchmark results for later comparisons.

The table below shows the baseline results for the original parser. Each value is the average of the corresponding statistic from the two original-parser runs.

| Benchmark | Mean | Median |
|---|---:|---:|
| `lifecycle` | 108.68 ns | 99.18 ns |
| `complete_request` | 91.59 ns | 86.50 ns |
| `fragmented_request` | 99.86 ns | 99.94 ns |
| `byte_by_byte_request` | 419.17 ns | 419.37 ns |
| `malformed_request` | 14.94 ns | 14.31 ns |
| `request_with_body` | 134.02 ns | 132.98 ns |
| `many_headers` | 2.00 µs | 1.96 µs |
| `large_body` | 18.62 µs | 16.67 µs |
| `fragmented_body` | 14.00 µs | 14.02 µs |
| `long_target` | 218.20 ns | 212.14 ns |

The complete baseline data is available in [original parser run 1](/blog/benchmarking_profiling_iterating/benchmark_2026-09-12_17-01-37.048733016.json) and [original parser run 2](/blog/benchmarking_profiling_iterating/benchmark_2026-09-12_17-01-46.666867265.json).

At this point I had a baseline, but the benchmark results could only tell me which workloads were slower. They could not tell me why.

To answer that, I needed to look deeper into what the CPU was actually doing.

## Investigating with `perf`

With baseline statistics from the benchmarks, I continued the performance investigation using `perf`, specifically `perf record` and `perf report`.

`perf` is a Linux performance-analysis tool that can sample hardware and software events while a program is running. While my benchmark suite tells me **how long** a workload takes, profiling with `perf` can help show me **where the CPU is spending its time**.

I recorded the benchmark suite and opened the resulting profile with `perf report`. One result immediately stood out: `__memmove_avx_unaligned_erms`, an optimized implementation of `memmove` provided by glibc, accounted for roughly 85% of sampled self CPU in the profile.

![Initial perf report showing memmove dominating the profile](/blog/benchmarking_profiling_iterating/perf-overview.png)

This did not immediately tell me what was wrong with my parser. `memmove` simply moves a range of bytes from one memory location to another while correctly handling overlapping regions.

The more useful question was:

**Why was my parser causing so much memory to be moved in the first place?**

Expanding the call graph showed that much of the activity attributed to `memmove` appeared while the `large_body` and `fragmented_body` workloads were running.

![Expanded perf call graph showing the main sources of memmove samples](/blog/benchmarking_profiling_iterating/perf-memmove-callgraph.png)

This gave me a much narrower area of the parser to investigate. It did not yet prove that eliminating the memory movement would improve every one of those workloads, but it showed me where to start looking.

The profiler had shown me what operation was consuming CPU time and which workloads were responsible for much of it. What it had not yet told me was which part of my implementation was causing those memory moves.

## Tracing the Bottleneck Back to the Parser

At this point, I knew what operation was consuming CPU time and which workloads were causing it. The next step was to inspect the parser implementation and determine what could be triggering repeated calls to `memmove`.

The parser stores incoming bytes in a contiguous string buffer. In the original design, once a section of the request had been parsed, I erased the consumed prefix from that buffer. Conceptually, the operation looked like this:

```cpp
buffer_.erase(0, consumed);
```

Erasing from the beginning of a contiguous string is not free. Every byte that remains after the erased prefix must be shifted toward the front of the allocation. That shift can be implemented using `memmove` because the source and destination ranges overlap.

For a small request, this cost is easy to miss. As the buffered data grows, however, removing a prefix can require moving a much larger suffix. Repeating that operation at multiple parser state transitions means the parser can spend time rearranging bytes it already owns instead of only examining new input.

That behavior matched what I had seen in the profile. The parser was not explicitly calling `memmove`, but its use of `std::string::erase()` created the underlying memory movement.

The alternative was to stop physically removing bytes as they were consumed. I added a cursor that records the first unconsumed position in the buffer. Parsing code then operates on a view beginning at that position:

```cpp
auto RequestParser::remaining_buffer() const noexcept -> std::string_view {
    return std::string_view{buffer_}.substr(cursor_);
}
```

Instead of erasing a parsed prefix, the parser advances the cursor:

```cpp
cursor_ += consumed;
```

This changes prefix consumption from an operation proportional to the number of bytes that must be shifted into a constant-time index update. The bytes remain in the allocation while the request is being parsed, but the parser ignores everything before `cursor_`. When the parser is reset for reuse, it clears the buffer and returns the cursor to zero.

The tradeoff is that consumed bytes remain in memory until reset. For this parser, that is acceptable because the buffer already represents a single in-progress request and is cleared at the end of its lifecycle. The important change is that parsing no longer repeatedly reorganizes the same contiguous storage while that request is being processed.

The profile gave me a plausible explanation and the cursor design removed the suspicious operation. That still did not prove that the new design was faster. The next step was to rerun the same benchmarks under the same conditions.

## Benchmarking the New Design

I benchmarked the cursor-based parser using the same 10,000 iterations per sample, 20 samples per workload, and two independent runs used for the baseline. For each implementation, I averaged the two run-level means and medians. The percentage change below is calculated from the averaged means, with a positive value representing lower latency.

| Benchmark | Original mean | Cursor mean | Mean latency change |
|---|---:|---:|---:|
| `lifecycle` | 108.68 ns | 90.18 ns | **17.0% lower** |
| `complete_request` | 91.59 ns | 76.98 ns | **15.9% lower** |
| `fragmented_request` | 99.86 ns | 99.19 ns | 0.7% lower |
| `byte_by_byte_request` | 419.17 ns | 419.76 ns | 0.1% higher |
| `malformed_request` | 14.94 ns | 15.07 ns | 0.9% higher |
| `request_with_body` | 134.02 ns | 117.53 ns | **12.3% lower** |
| `many_headers` | 2.00 µs | 1.78 µs | **10.9% lower** |
| `large_body` | 18.62 µs | 15.75 µs | **15.4% lower** |
| `fragmented_body` | 14.00 µs | 13.95 µs | 0.3% lower |
| `long_target` | 218.20 ns | 212.23 ns | 2.7% lower |

The complete optimized data is available in [cursor-based parser run 1](/blog/benchmarking_profiling_iterating/benchmark_2026-09-12_17-00-48.677332106.json) and [cursor-based parser run 2](/blog/benchmarking_profiling_iterating/benchmark_2026-09-12_17-01-20.775822386.json).

The strongest improvements appeared in `lifecycle`, `complete_request`, `request_with_body`, `many_headers`, and `large_body`. These workloads saw mean latency reductions of roughly 10% to 17%.

The `large_body` results also show why I collected more than the mean. This workload had occasional high-latency samples in all four runs, which pulled its mean upward. Averaging the medians from each pair of runs gives a better picture of its typical behavior:

| `large_body` statistic | Original parser | Cursor parser | Latency change |
|---|---:|---:|---:|
| Mean | 18.62 µs | 15.75 µs | **15.4% lower** |
| Median | 16.67 µs | 13.82 µs | **17.1% lower** |

The optimization did not improve every workload. `fragmented_request`, `byte_by_byte_request`, `malformed_request`, and `fragmented_body` were effectively unchanged, while `long_target` showed only a small difference. Changes below roughly 1% in these runs are small enough that I would not treat them as meaningful improvements or regressions.

At first, the nearly unchanged `fragmented_body` result may seem surprising because that benchmark contributed heavily to the original `memmove` profile. However, a profiler identifies where time is being spent during a particular recording; it does not guarantee that removing one operation will dominate the total runtime of every workload in its call graph. The final timing suggests that other costs in the fragmented workload, such as repeated calls and incremental body handling, account for most of its runtime after the buffer movement is removed.

I also profiled the benchmark suite after implementing the cursor. The overall `perf report` remained visually similar because it reports the distribution of samples across the program. The same body-heavy benchmarks were still the most expensive parts of the suite, so they continued to occupy a large proportion of the profile even though their absolute timings changed.

![Perf report after the cursor optimization](/blog/benchmarking_profiling_iterating/perf-after-overview.png)

This distinction is important. The profiler helped identify a hot operation and trace it back to the design, while the controlled benchmarks measured whether changing that design actually reduced latency. A similar-looking proportional profile does not cancel out a measurable reduction in absolute execution time.

## Conclusion and Lessons

This optimization was not a matter of guessing which line of code looked slow. I first established repeatable workloads, used `perf` to find where the program was spending its time, traced the dominant `memmove` activity back to repeated prefix erasure, changed the parser's buffer-management strategy, and then tested the new design against the same baseline.

The cursor-based parser reduced mean latency by roughly 10% to 17% in several affected workloads. The largest typical improvement appeared in `large_body`, whose median fell by about 17.1%. Other workloads remained effectively unchanged, which is just as important to report. The optimization solved a specific source of unnecessary memory movement; it did not make every part of parsing faster.

The most useful lesson from this process is that benchmarking and profiling answer different questions. Benchmarks show whether performance changed and by how much. Profilers help explain where to investigate. Used together, they turn optimization from intuition into an iterative process:

1. establish a baseline;
2. profile the program;
3. form a hypothesis from the evidence;
4. change the design;
5. benchmark again under the same conditions;
6. keep the result only if the measurements support it.

There are still limits to this experiment. These are parser microbenchmarks collected on one machine, not end-to-end measurements of the entire server under production traffic. They isolate the effect I wanted to study, but they do not measure socket I/O, connection management, scheduling, or concurrency. Those layers will require their own benchmarks as the server gains non-blocking I/O, `epoll`, and a thread pool.

For now, the result is a smaller and more defensible improvement: the parser performs less unnecessary data movement, the affected workloads are measurably faster, and I have a repeatable process for investigating the next bottleneck.
