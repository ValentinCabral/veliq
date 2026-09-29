# VELIQ Language 0.1

Sintaxis ASCII de términos composicionales con raíces versionadas e ID conceptual estable. Una expresión es `raiz(argumento,...)`; cada argumento es otro término o una cadena JSON. No hay operadores implícitos. `nu(x)` niega exactamente `x`; `pro(x)` prohíbe `x`, diferente de ausencia de evidencia. `seq(a,b)` ordena; `par(a,b)` expresa concurrencia. `ri("id")` identifica contenido compartido, cuya resolución es responsabilidad del receptor. `opq("...")` conserva datos exactos.

Ejemplo: `seq(sen(ri("error:1")),nar(ri("error:1")),sel(ri("tests:1")))`.

El diccionario está en `packages/language/dictionary.ts`. Tipos de raíz y aridad se validan; aún no existe una semántica universal para conceptos arbitrarios ni traducción libre. Los nuevos términos requieren propuesta versionada y pruebas de colisión, frecuencia, tokenización y comprensión. No se modifica ningún ID publicado. La traducción española soporta una plantilla exacta documentada para la demostración. Otros textos fallan explícitamente.
