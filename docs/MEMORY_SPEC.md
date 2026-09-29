# Memoria local 0.1

SQLite WAL contiene contenido por SHA-256, registros por ámbito compuesto, versiones append-only e invalidación con versión previa obligatoria. `retrieve` busca determinísticamente ID o texto en el ámbito exacto; `getContent` recalcula hash. La memoria no resume ni embebe. El almacenamiento no cifra. Las referencias entre peers se recuperan desde el remitente explícito y se verifican por contenido. Falta política de expiración, borrado físico y ámbitos compartidos autorizados.
