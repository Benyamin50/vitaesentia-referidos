from sqlalchemy import Column, Integer, String, TIMESTAMP, Text
from db import Base
import datetime

class Colaborador(Base):
    __tablename__ = "colaboradores"
    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    codigo_unico = Column(String(50), unique=True, nullable=False)
    fecha_registro = Column(TIMESTAMP, default=datetime.datetime.utcnow)
    rol = Column(String(20), default='colaborador')  # 'admin' o 'colaborador'

class Referido(Base):
    __tablename__ = "referidos"
    id = Column(Integer, primary_key=True)
    colaborador_id = Column(Integer, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    fecha_scan = Column(TIMESTAMP, default=datetime.datetime.utcnow)
    
    # ========== GEOLOCALIZACIÓN Y DISPOSITIVO ==========
    pais = Column(String(100))              # País desde la IP
    ciudad = Column(String(100))            # Ciudad desde la IP
    idioma = Column(String(10))             # Idioma del dispositivo (Accept-Language)
    tipo_dispositivo = Column(String(50))   # móvil, tablet, desktop
    sistema_operativo = Column(String(100)) # Android, iOS, Windows, macOS, Linux
    navegador = Column(String(100))         # Chrome, Firefox, Safari, Edge, Opera
    
    # ========== DATOS DEL FORMULARIO ==========
    referido_nombre = Column(String(100))       # Nombre de la persona referida
    referido_apellido = Column(String(100))     # Apellido de la persona referida
    referido_email = Column(String(100))        # Email de la persona referida
    referido_telefono = Column(String(20))      # Teléfono de la persona referida
    formulario_completado = Column(Integer, default=0)  # 0 = no, 1 = sí
    
    # ========== TOKEN DE ACCESO A VIDEOS ==========
    video_token = Column(String(64))            # Token único para ver los videos