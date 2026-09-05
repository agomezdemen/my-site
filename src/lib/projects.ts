export type Project = {
  slug: string
  title: string
  summary: string
  status: string
  technologies: string[]
  sections: Array<{ title: string; body: string | string[]; bullets?: string[] }>
}

export const projects: Project[] = [
  {
    slug: 'http-server',
    title: 'Modern C++ HTTP Server',
    summary:
      'A from-scratch HTTP/1.1 server written in C++23 to explore Linux networking, systems programming, performance measurement, and modern C++ design without abstracting away the underlying OS interfaces.',
    status: 'In progress',
    technologies: [
      'C++23',
      'Linux / POSIX sockets',
      'HTTP/1.1',
      'CMake / CTest',
      'Catch2',
      'GitHub Actions',
      'Custom benchmarking framework',
      'Linux perf',
      'Non-blocking I/O / epoll in progress',
    ],
    sections: [
      {
        title: 'Overview',
        body:
          'The server is built directly on Linux/POSIX socket APIs with an emphasis on explicit ownership, testable abstractions, and measurement-driven development. The current implementation supports TCP connections, incremental HTTP request parsing, response serialization, method/path-based routing, and both unit and process-level integration testing. The next major milestone is moving the networking layer from blocking I/O to non-blocking sockets with epoll.',
      },
      {
        title: 'Architecture',
        body:
          'The server is divided into small layers rather than hiding networking behind a large framework. This keeps socket lifetime, parser state, HTTP behavior, and routing independently testable.',
        bullets: [
          'Move-only RAII ownership for file descriptors',
          'TCP listener and connection abstractions',
          'Incremental HTTP request parser',
          'HTTP request and response types',
          'Method/path-based router',
          'Response serialization',
          'Process-level integration test utilities',
        ],
      },
      {
        title: 'Networking',
        body:
          'The networking layer uses Linux/POSIX sockets directly. TCP resources are managed through RAII so file descriptor ownership is explicit and automatically cleaned up. Connection handling is currently synchronous and blocking while the next stage of the project introduces non-blocking sockets and epoll. That transition is intended to move the server from a correctness-focused HTTP implementation toward an event-driven architecture capable of handling many concurrent connections efficiently.',
      },
      {
        title: 'HTTP Parser',
        body:
          'The HTTP parser is incremental and state-driven, allowing requests to arrive across arbitrary socket-read boundaries rather than assuming an entire request is available at once. The parser has been one of the main areas of both correctness testing and performance analysis.',
        bullets: [
          'Request-line parsing',
          'Headers',
          'Message bodies',
          'Fragmented requests',
          'Byte-by-byte input',
          'Malformed requests',
          'Large bodies',
          'Long request targets',
        ],
      },
      {
        title: 'Testing',
        body:
          'The project currently has 111 Catch2 tests covering HTTP parsing, request/response behavior, networking utilities, and server behavior. Process-level integration tests launch the real server executable and communicate with it through actual TCP sockets rather than mocking the networking layer. CTest provides the test runner, and GitHub Actions automatically builds and executes the suite in CI.',
      },
      {
        title: 'Benchmarking',
        body:
          'I built a custom C++ benchmarking framework for measuring parser workloads at nanosecond resolution. Results are exported to timestamped JSON files so changes can be compared across implementations.',
        bullets: [
          'Mean',
          'Median',
          'Minimum / maximum',
          'Standard deviation',
          'p95 / p99 latency',
          'Operations per second',
          'Complete, fragmented, byte-by-byte, malformed, many-header, large-body, and fragmented-body workloads',
        ],
      },
      {
        title: 'Profiling / Optimization',
        body: [
          'Rather than optimizing based on assumptions, I use Linux perf to identify actual hot paths. Profiling initially showed that approximately 85% of sampled self CPU time in a combined parser workload was being spent in memmove, particularly during large and fragmented body benchmarks.',
          'Tracing the call path led back to repeated string-buffer movement inside the parser. I redesigned the parser to maintain a cursor into its input buffer instead of repeatedly removing already-consumed data. After the change, representative benchmark results improved substantially, including byte-by-byte parsing dropping from roughly 414 ns to 162 ns per request.',
          'This was also a useful example of an optimization whose cause was not obvious from the source alone and only became clear through profiling.',
        ],
      },
      {
        title: 'What I Learned',
        body:
          'This project has given me practical experience with systems programming, protocol parsing, measurement, and performance-oriented C++ design. The next stage is focused on event-driven networking using non-blocking I/O and epoll, followed by concurrent request processing.',
        bullets: [
          'Linux socket programming',
          'RAII and resource ownership in modern C++',
          'Incremental protocol parsing',
          'Designing around fragmented network input',
          'Unit and process-level integration testing',
          'Benchmark design and statistical analysis',
          'CPU profiling with Linux perf',
          'Reading profiler call graphs and disassembly',
          'Distinguishing measured bottlenecks from assumed ones',
          'Performance-oriented data structure and buffer design',
        ],
      },
    ],
  },
]
