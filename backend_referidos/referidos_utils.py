from datetime import datetime, timezone


def _fecha_referido(valor):
    fecha = None
    if isinstance(valor, datetime):
        fecha = valor
    elif isinstance(valor, str) and valor.strip():
        texto = valor.strip()
        try:
            fecha = datetime.fromisoformat(texto.replace('Z', '+00:00'))
        except ValueError:
            for formato in ('%d/%m/%Y %H:%M:%S', '%d/%m/%Y, %H:%M:%S', '%d/%m/%Y %H:%M', '%d/%m/%Y'):
                try:
                    fecha = datetime.strptime(texto, formato)
                    break
                except ValueError:
                    continue
    if fecha is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    # Los valores ISO con zona se comparan en UTC. Los valores sin zona se
    # interpretan como UTC; Apps Script debe preferir fechas ISO con zona.
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(timezone.utc)


def ordenar_referidos(referidos):
    """Más recientes primero; fechas ausentes o inválidas al final, sin mutar la lista."""
    return sorted(referidos, key=lambda referido: _fecha_referido(referido.get('fecha_scan')), reverse=True)
