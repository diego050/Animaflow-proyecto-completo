#!/usr/bin/env python
"""RQ Worker entry point with queue segregation."""
import os
import sys
import argparse
from redis import Redis
from rq import Worker, Queue

from app.core.config import settings


def main():
    parser = argparse.ArgumentParser(description="AnimaFlow RQ Worker")
    parser.add_argument(
        "--queues",
        nargs="+",
        default=["default"],
        help="Queue names to listen on (default: default)",
    )
    parser.add_argument(
        "--burst",
        action="store_true",
        help="Run in burst mode (process jobs then exit)",
    )
    args = parser.parse_args()

    redis_conn = Redis.from_url(settings.REDIS_URL)
    queues = [Queue(name, connection=redis_conn) for name in args.queues]

    # En Windows os.fork() no existe, así que usamos SimpleWorker
    if os.name == "nt":
        from rq import SimpleWorker

        worker = SimpleWorker(queues, connection=redis_conn)
    else:
        worker = Worker(queues, connection=redis_conn)

    worker.work(burst=args.burst)


if __name__ == "__main__":
    main()
