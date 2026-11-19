from fastapi import FastAPI 
from pydantic import BaseModel, Field 
import numpy as np 
import tensorflow as tf 
 
app = FastAPI( 
    title="Servicio inteligente de priorización", 
    description="Ejemplo educativo con TensorFlow y FastAPI", 
    version="1.0.0" 
) 
 
model = tf.keras.models.load_model("modelo_prioridad.keras") 
 
class Solicitud(BaseModel): 
    urgencia: float = Field(ge=0, le=10, description="Urgencia reportada entre 0 y 10") 
    usuarios_afectados: float = Field(ge=0, le=100, description="Usuarios afectados entre 0 y 100") 
 
@app.get("/") 
def inicio(): 
    return {"mensaje": "Servicio inteligente activo"} 
 
@app.post("/predecir") 
def predecir(solicitud: Solicitud): 
    entrada = np.array([[ 
        solicitud.urgencia / 10.0, 
        solicitud.usuarios_afectados / 100.0 
    ]], dtype=np.float32) 
 
    probabilidad = float(model.predict(entrada, verbose=0)[0][0]) 
    clase = "alta" if probabilidad >= 0.5 else "normal" 
 
    return { 
        "prioridad_predicha": clase, 
        "probabilidad_prioridad_alta": round(probabilidad, 4), 
        "nota": "Resultado demostrativo; requiere validación antes de uso real." 
    } 
 