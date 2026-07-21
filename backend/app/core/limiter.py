"""
limiter.py — Global slowapi Limiter instance'i.

Ayri dosyada tutuyoruz cunku hem main.py hem de router'lar (auth.py, stream.py)
limiter'a ihtiyac duyuyor. main.py'de tanimlanirsa circular import olusur:
  main.py -> routers -> main.py
Buraya cikarinca zincir kirilir: hem main hem routers -> core.limiter.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
)