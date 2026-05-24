import logging
import sys

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(f"animaflow.{name}")
    if not logger.handlers:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(name)s] %(levelname)s: %(message)s",
            datefmt="%H:%M:%S"
        ))
        logger.addHandler(console_handler)
        logger.setLevel(logging.INFO)
    return logger
