#!/usr/bin/env bash
# Run against an already-running server. Copy this script unchanged between checkouts.
set -euo pipefail
export LC_ALL=C

# Configuration (durations use wrk's duration syntax).
URL="${URL:-http://127.0.0.1:8080/}"
WRK_THREADS="${WRK_THREADS:-4}"
CONNECTION_COUNTS=(1 10 25 50 100 250 500 1000 2500 5000 10000 20000)
DURATION="${DURATION:-30s}"
MEASURED_RUNS="${MEASURED_RUNS:-5}"
WARMUP_DURATION="${WARMUP_DURATION:-5s}"
COOLDOWN_SECONDS="${COOLDOWN_SECONDS:-2}"
# Retain the previous script's connection-close workload and explicit timeout.
# Keep these identical when comparing servers.
WRK_TIMEOUT="${WRK_TIMEOUT:-2s}"
WRK_HEADERS=(-H 'Connection: close')

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(cd -- "$SCRIPT_DIR/../.." && pwd)
for tool in wrk awk mktemp; do
    command -v "$tool" >/dev/null || { echo "Required tool missing: $tool" >&2; exit 1; }
done
for value in "$WRK_THREADS" "$MEASURED_RUNS" "${CONNECTION_COUNTS[@]}"; do
    [[ $value =~ ^[1-9][0-9]*$ ]] || { echo "Threads, runs, and connections must be positive integers" >&2; exit 1; }
done
[[ $COOLDOWN_SECONDS =~ ^[0-9]+([.][0-9]+)?$ ]] || { echo "Invalid cooldown" >&2; exit 1; }

mkdir -p -- "$ROOT/benchmarks/results/wrk"
# mktemp creates the directory atomically, including when suites start simultaneously.
RESULTS=$(mktemp -d "$ROOT/benchmarks/results/wrk/$(date -u +%Y%m%dT%H%M%SZ)_XXXXXX")
echo "Results: $RESULTS"
trap 'echo "Interrupted; partial results retained in $RESULTS" >&2; exit 130' INT
trap 'echo "Terminated; partial results retained in $RESULTS" >&2; exit 143' TERM

BASE_ARGS=(--timeout "$WRK_TIMEOUT" --latency "${WRK_HEADERS[@]}")
{
    printf 'date_utc: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'kernel: '; uname -srm || true
    printf 'cpu_model: '
    if [[ -r /proc/cpuinfo ]]; then
        awk -F ': *' '/^(model name|Hardware)[[:space:]]*:/ {print $2; found=1; exit} END {if (!found) print "unavailable"}' /proc/cpuinfo
    else
        echo unavailable
    fi
    printf 'logical_cpu_count: '; getconf _NPROCESSORS_ONLN || true
    printf 'wrk_version: '; wrk --version 2>&1 | awk 'NR == 1 {sub(/ Copyright.*/, ""); print}' || true
    printf 'ulimit_n: '; ulimit -n
    printf 'URL: %s\nwrk_threads: %s\nduration: %s\nmeasured_runs: %s\nwarmup_duration: %s\ncooldown_seconds: %s\n' \
        "$URL" "$WRK_THREADS" "$DURATION" "$MEASURED_RUNS" "$WARMUP_DURATION" "$COOLDOWN_SECONDS"
    printf 'connection_counts:'; printf ' %s' "${CONNECTION_COUNTS[@]}"; printf '\n'
    printf 'measured_command_template: '; printf '%q ' wrk "${BASE_ARGS[@]}" -t EFFECTIVE_THREADS -c CONNECTIONS -d "$DURATION" "$URL"; printf '\n'
    printf 'latency_unit: microseconds\ntransfer_per_sec: original wrk unit\n'
    printf 'Missing statistics remain empty; percentiles are never interpolated.\n'
    printf 'Effective threads: min(wrk_threads, connections). wrk may round connections down when dividing among threads.\n'
} > "$RESULTS/environment.txt" 2>&1
# Preserve the script alongside the raw data (public copy omits identifying metadata).
cp -- "${BASH_SOURCE[0]}" "$RESULTS/run_wrk.sh"

SUMMARY="$RESULTS/summary.csv"
printf '%s\n' 'timestamp,wrk_threads,connections,duration,run,requests_per_sec,total_requests,transfer_per_sec,mean_latency_us,latency_stddev_us,p50_latency_us,p75_latency_us,p90_latency_us,p95_latency_us,p99_latency_us,max_latency_us,connect_errors,read_errors,write_errors,timeout_errors,non_2xx_3xx_responses,status,exit_code,warmup_exit_code,raw_file' > "$SUMMARY"

# Return nonzero for failed/incomplete measurements; always append their row.
parse_run() {
    awk -v timestamp="$1" -v threads="$threads" -v connections="$2" \
        -v duration="$DURATION" -v run="$3" -v code="$4" -v warmup_code="$5" -v raw_file="$6" '
    function latency(value, factor) {
        if (value ~ /^[0-9]+([.][0-9]+)?us$/) factor=1
        else if (value ~ /^[0-9]+([.][0-9]+)?ms$/) factor=1000
        else if (value ~ /^[0-9]+([.][0-9]+)?s$/) factor=1000000
        else return ""
        return sprintf("%.6f", (value+0)*factor)
    }
    function csv(value) { gsub(/"/, "\"\"", value); return "\"" value "\"" }
    $1 == "Latency" && $2 != "Distribution" {
        mean=latency($2); stddev=latency($3); maximum=latency($4)
    }
    $1 == "50%" {p50=latency($2)}
    $1 == "75%" {p75=latency($2)}
    $1 == "90%" {p90=latency($2)}
    $1 == "95%" {p95=latency($2)}
    $1 == "99%" {p99=latency($2)}
    $1 ~ /^[0-9]+$/ && $2 == "requests" && $3 == "in" {total=$1}
    $1 == "Requests/sec:" && $2 ~ /^[0-9]+([.][0-9]+)?$/ {rps=$2}
    $1 == "Transfer/sec:" {transfer=$2}
    $1 == "Socket" && $2 == "errors:" {
        for (i=3; i<NF; i+=2) {
            value=$(i+1); sub(/,$/, "", value)
            if (value ~ /^[0-9]+$/) errors[$i]=value
        }
    }
    $1 == "Non-2xx" && $4 == "responses:" && $5 ~ /^[0-9]+$/ {non_success=$5}
    END {
        status="OK"
        if (errors["connect"]+errors["read"]+errors["write"]+errors["timeout"]+non_success > 0) status="ERRORS"
        if (warmup_code != 0) status="WARMUP_FAILED"
        if (code != 0 || rps == "" || total == "" || total+0 == 0) status="FAILED"
        print csv(timestamp) "," threads "," connections "," csv(duration) "," run "," rps "," total "," csv(transfer) "," mean "," stddev "," p50 "," p75 "," p90 "," p95 "," p99 "," maximum "," errors["connect"] "," errors["read"] "," errors["write"] "," errors["timeout"] "," non_success "," status "," code "," warmup_code "," csv(raw_file)
        if (status != "OK") exit 1
    }' "$RESULTS/$6" >> "$SUMMARY"
}

failed=0
for connections in "${CONNECTION_COUNTS[@]}"; do
    threads=$WRK_THREADS
    if (( threads > connections )); then
        threads=$connections
    fi
    echo "connections=$connections threads=$threads warmup"
    warmup_code=0
    # Warm-up logs are separate and never parsed into the measured dataset.
    wrk "${BASE_ARGS[@]}" -t "$threads" -c "$connections" -d "$WARMUP_DURATION" "$URL" \
        > "$RESULTS/connections_${connections}_warmup.txt" 2>&1 || warmup_code=$?
    if (( warmup_code != 0 )); then
        echo "Warm-up failed: connections=$connections exit=$warmup_code" >&2
        failed=1
    fi
    for ((run=1; run<=MEASURED_RUNS; run++)); do
        echo "connections=$connections run=$run/$MEASURED_RUNS"
        timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        raw_file="connections_${connections}_run_${run}.txt"
        code=0
        # Direct redirection preserves stdout/stderr bytes, without added annotations.
        wrk "${BASE_ARGS[@]}" -t "$threads" -c "$connections" -d "$DURATION" "$URL" \
            > "$RESULTS/$raw_file" 2>&1 || code=$?
        if ! parse_run "$timestamp" "$connections" "$run" "$code" "$warmup_code" "$raw_file"; then
            echo "Measurement flagged: connections=$connections run=$run exit=$code; see summary.csv and $raw_file" >&2
            failed=1
        fi
        if (( run < MEASURED_RUNS )); then
            sleep "$COOLDOWN_SECONDS"
        fi
    done
done
printf 'Finished: %s (suite exit status: %s)\n' "$SUMMARY" "$failed"
exit "$failed"
