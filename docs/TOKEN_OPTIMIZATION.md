# Medición

El contador incluido mide bytes UTF-8 exactos para un perfil byte a byte artificial; **no es un tokenizador de GPT, Claude ni otro LLM**. El estimador `ceil(bytes/4)` está etiquetado como estimación. `hybrid` acepta una candidata sólo si conserva VSR en round-trip y `(candidato + overhead) < original` bajo el mismo contador. `observe` mantiene original. No hay contabilidad de tokens de salida, llamadas de traducción LLM, reintentos ni precios de proveedor: no se informa ahorro monetario. Comparación con resumen convencional y tokenizadores oficiales pendiente.
