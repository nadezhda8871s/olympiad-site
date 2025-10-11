def pay(order_id: int, success: bool):
    # Мок «успешной/неуспешной» оплаты
    return {"order_id": order_id, "status": "paid" if success else "failed"}
