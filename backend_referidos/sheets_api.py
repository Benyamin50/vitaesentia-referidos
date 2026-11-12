import requests
import os

APPS_SCRIPT_URL = os.environ.get(
    'APPS_SCRIPT_URL', 
    'https://script.google.com/macros/s/AKfycbzTI-aO0-4FRrbMyjwadEFYRm_eZdbhyldAoCX4HYacxSFLsbPu-R5UfkLMsqT53On-7g/exec'
)

def get_colaboradores():
    res = requests.get(APPS_SCRIPT_URL, params={'action': 'getColaboradores'}, timeout=10)
    return res.json()

def crear_colaborador(nombre, email):
    res = requests.post(APPS_SCRIPT_URL, json={
        'action': 'crearColaborador',
        'nombre': nombre,
        'email': email
    }, timeout=10)
    return res.json()

def get_referidos(colab_id):
    res = requests.get(
        APPS_SCRIPT_URL, 
        params={'action': 'getReferidos', 'colaborador_id': colab_id},
        timeout=10
    )
    return res.json()

def verificar_colaborador(codigo):
    res = requests.get(
        APPS_SCRIPT_URL, 
        params={'action': 'verificarColaborador', 'codigo': codigo},
        timeout=10
    )
    return res.json()

def registrar_referido(data):
    res = requests.post(APPS_SCRIPT_URL, json={
        'action': 'registrarReferido',
        **data
    }, timeout=10)
    return res.json()