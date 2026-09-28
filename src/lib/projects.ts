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
      'A from-scratch HTTP/1.1 server written in C++23 with epoll and non-blocking sockets for event-driven networking. The server currently runs on a single thread, with multithreading planned next.',
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
      'Non-blocking I/O / epoll',
    ],
    sections: [
      {
        title: 'Overview',
        body:
          'The server is built directly on Linux/POSIX socket APIs with an emphasis on explicit ownership, testable abstractions, and measurement-driven development. The current implementation supports event-driven TCP connection handling with epoll and non-blocking sockets, incremental HTTP request parsing, response serialization, method/path-based routing, and both unit and process-level integration testing. The next major milestone is adding multithreading.',
      },
      {
        title: 'Architecture',
        body:
          'The server is divided into small layers rather than hiding networking behind a large framework. This keeps socket lifetime, parser state, HTTP behavior, and routing independently testable.',
        bullets: [
          'Move-only RAII ownership for file descriptors',
          'TCP listener and connection abstractions',
          'Single-threaded event loop using epoll and non-blocking sockets',
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
          'The networking layer uses Linux/POSIX sockets directly. TCP resources are managed through RAII so file descriptor ownership is explicit and automatically cleaned up. Connection handling now uses epoll and non-blocking sockets, allowing a single thread to manage multiple concurrent connections by responding to I/O readiness events. This event-driven implementation is complete, and multithreading is the next step.',
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
          'The project currently has 121 Catch2 unit tests covering HTTP parsing, request/response behavior, networking utilities, and server behavior. Process-level integration tests launch the real server executable and communicate with it through actual TCP sockets rather than mocking the networking layer. CTest provides the test runner, and GitHub Actions automatically builds and executes the suite in CI.',
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
          'This project has given me practical experience with systems programming, protocol parsing, measurement, and performance-oriented C++ design. Implementing epoll with non-blocking sockets extended that work into event-driven networking. The next stage is adding multithreading so the server can use multiple CPU cores.',
        bullets: [
          'Linux socket programming',
          'Event-driven networking with epoll and non-blocking sockets',
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
