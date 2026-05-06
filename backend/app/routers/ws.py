"""
WebSocket — real-time уведомления для всех ролей.

Каналы:
  ws://.../ws/operator/{store_id}?token=...
  ws://.../ws/courier/{user_id}?token=...
  ws://.../ws/customer/{user_id}?token=...
  ws://.../ws/manager/{client_id}?token=...
"""
import json
import asyncio
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.websockets import WebSocketState
import jwt

from app.config import settings

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # channel_key → set of WebSocket connections
        self.connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, ws: WebSocket, channel: str):
        await ws.accept()
        if channel not in self.connections:
            self.connections[channel] = set()
        self.connections[channel].add(ws)
        print(f"WS connected: {channel} (total: {len(self.connections[channel])})")

    def disconnect(self, ws: WebSocket, channel: str):
        if channel in self.connections:
            self.connections[channel].discard(ws)
            if not self.connections[channel]:
                del self.connections[channel]

    async def send_to_channel(self, channel: str, message: dict):
        """Отправить сообщение всем в канале"""
        if channel not in self.connections:
            return
        dead = set()
        for ws in self.connections[channel].copy():
            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_json(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.connections[channel].discard(ws)

    async def broadcast_to_store(self, store_id: str, message: dict):
        await self.send_to_channel(f"operator:{store_id}", message)

    async def broadcast_to_courier(self, courier_id: str, message: dict):
        await self.send_to_channel(f"courier:{courier_id}", message)

    async def broadcast_to_customer(self, customer_id: str, message: dict):
        await self.send_to_channel(f"customer:{customer_id}", message)

    async def broadcast_to_manager(self, client_id: str, message: dict):
        await self.send_to_channel(f"manager:{client_id}", message)


manager = ConnectionManager()


def verify_ws_token(token: str) -> dict:
    """Верифицировать JWT для WebSocket соединения"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        return {}


@router.websocket("/operator/{store_id}")
async def operator_ws(ws: WebSocket, store_id: str, token: str = Query(...)):
    payload = verify_ws_token(token)
    if not payload or payload.get("role") not in ("store_operator", "superadmin", "network_manager"):
        await ws.close(code=4001, reason="Unauthorized")
        return

    channel = f"operator:{store_id}"
    await manager.connect(ws, channel)
    try:
        await ws.send_json({"type": "connected", "channel": channel})
        while True:
            # Держим соединение + обрабатываем ping
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=30)
                if data == "ping":
                    await ws.send_text("pong")
            except asyncio.TimeoutError:
                await ws.send_text("ping")  # keep-alive
    except WebSocketDisconnect:
        manager.disconnect(ws, channel)


@router.websocket("/courier/{courier_id}")
async def courier_ws(ws: WebSocket, courier_id: str, token: str = Query(...)):
    payload = verify_ws_token(token)
    if not payload or payload.get("role") not in ("courier", "superadmin"):
        await ws.close(code=4001, reason="Unauthorized")
        return

    channel = f"courier:{courier_id}"
    await manager.connect(ws, channel)
    try:
        await ws.send_json({"type": "connected", "channel": channel})
        while True:
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=30)
                if data == "ping":
                    await ws.send_text("pong")
            except asyncio.TimeoutError:
                await ws.send_text("ping")
    except WebSocketDisconnect:
        manager.disconnect(ws, channel)


@router.websocket("/customer/{customer_id}")
async def customer_ws(ws: WebSocket, customer_id: str, token: str = Query(...)):
    payload = verify_ws_token(token)
    if not payload:
        await ws.close(code=4001, reason="Unauthorized")
        return

    channel = f"customer:{customer_id}"
    await manager.connect(ws, channel)
    try:
        await ws.send_json({"type": "connected", "channel": channel})
        while True:
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=30)
                if data == "ping":
                    await ws.send_text("pong")
            except asyncio.TimeoutError:
                await ws.send_text("ping")
    except WebSocketDisconnect:
        manager.disconnect(ws, channel)


@router.websocket("/manager/{client_id}")
async def manager_ws(ws: WebSocket, client_id: str, token: str = Query(...)):
    payload = verify_ws_token(token)
    if not payload or payload.get("role") not in ("network_manager", "superadmin"):
        await ws.close(code=4001, reason="Unauthorized")
        return

    channel = f"manager:{client_id}"
    await manager.connect(ws, channel)
    try:
        await ws.send_json({"type": "connected", "channel": channel})
        while True:
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=30)
                if data == "ping":
                    await ws.send_text("pong")
            except asyncio.TimeoutError:
                await ws.send_text("ping")
    except WebSocketDisconnect:
        manager.disconnect(ws, channel)
