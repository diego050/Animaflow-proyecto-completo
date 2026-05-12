import os
import sys
from redis import Redis
from rq import Worker, Queue, SimpleWorker

from app.core.config import settings

listen = ['default']

redis_conn = Redis.from_url(settings.REDIS_URL)

if __name__ == '__main__':
    # En Windows os.fork() no existe, así que usamos SimpleWorker
    if os.name == 'nt':
        worker = SimpleWorker(listen, connection=redis_conn)
    else:
        worker = Worker(listen, connection=redis_conn)
    
    worker.work()
