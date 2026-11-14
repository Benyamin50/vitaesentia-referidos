import re
from urllib.parse import parse_qs, urlparse


def normalizar_url_youtube(valor):
    if not isinstance(valor, str) or len(valor) > 2048:
        raise ValueError('Introduce una URL de YouTube válida')
    valor = valor.strip()
    if '://' not in valor:
        valor = 'https://' + valor
    try:
        url = urlparse(valor)
        host = (url.hostname or '').lower()
        if url.scheme not in ('http', 'https') or url.username or url.password or url.port:
            raise ValueError()
        partes = url.path.strip('/').split('/')
        video_id = ''
        if host in ('youtu.be', 'www.youtu.be') and len(partes) == 1:
            video_id = partes[0]
        elif host in ('youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'):
            if url.path.rstrip('/') == '/watch':
                video_id = parse_qs(url.query).get('v', [''])[0]
            elif len(partes) == 2 and partes[0] in ('embed', 'shorts', 'live'):
                video_id = partes[1]
        elif host in ('youtube-nocookie.com', 'www.youtube-nocookie.com'):
            if len(partes) == 2 and partes[0] == 'embed':
                video_id = partes[1]
        if not re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id):
            raise ValueError()
    except ValueError:
        raise ValueError('Introduce una URL de un video de YouTube válida') from None
    return f'https://www.youtube.com/watch?v={video_id}'


def validar_video(data):
    if not isinstance(data, dict):
        raise ValueError('Se requiere un objeto JSON')
    titulo = data.get('titulo')
    if not isinstance(titulo, str) or not 1 <= len(titulo.strip()) <= 200:
        raise ValueError('El título debe tener entre 1 y 200 caracteres')
    orden = data.get('orden', 0)
    if isinstance(orden, bool) or not isinstance(orden, int) or not 0 <= orden <= 2147483647:
        raise ValueError('El orden debe ser un número entero entre 0 y 2147483647')
    return {
        'titulo': titulo.strip(),
        'url_youtube': normalizar_url_youtube(data.get('url_youtube')),
        'orden': orden,
    }
