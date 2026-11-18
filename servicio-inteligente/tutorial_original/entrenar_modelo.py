import numpy as np 
import tensorflow as tf 
 
# Datos sintéticos: [urgencia (0-10), usuarios afectados (0-100)] 
X = np.array([ 
    [1, 2], [2, 5], [3, 8], [2, 15], [4, 10], 
    [5, 20], [6, 30], [7, 45], [8, 60], [9, 90], 
    [3, 3], [4, 25], [6, 15], [7, 70], [10, 100], 
    [1, 1], [2, 12], [5, 50], [8, 20], [9, 40] 
], dtype=np.float32) 
 
# Etiqueta didáctica: prioridad alta si urgencia >= 7 
# o si hay muchos usuarios afectados y urgencia >= 5. 
y = np.array([ 
    0 if not (u >= 7 or (n >= 40 and u >= 5)) else 1 
    for u, n in X 
], dtype=np.float32) 
 
# Normalización sencilla de las dos características 
X_norm = X.copy() 
X_norm[:, 0] = X_norm[:, 0] / 10.0 
X_norm[:, 1] = X_norm[:, 1] / 100.0 
 
tf.keras.utils.set_random_seed(42) 
 
model = tf.keras.Sequential([ 
    tf.keras.layers.Input(shape=(2,)), 
    tf.keras.layers.Dense(8, activation="relu"), 
    tf.keras.layers.Dense(4, activation="relu"), 
    tf.keras.layers.Dense(1, activation="sigmoid") 
]) 
 
model.compile( 
    optimizer="adam", 
    loss="binary_crossentropy", 
    metrics=["accuracy"] 
) 
 
model.fit(X_norm, y, epochs=100, verbose=0) 
model.save("modelo_prioridad.keras") 
print("Modelo entrenado y guardado en modelo_prioridad.keras")