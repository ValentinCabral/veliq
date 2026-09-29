# VELIQ Language 0.1

Sintaxis ASCII de términos composicionales con raíces versionadas e ID conceptual estable. Una expresión es `raiz(argumento,...)`; cada argumento es otro término o una cadena JSON. No hay operadores implícitos. `nu(x)` niega exactamente `x`; `pro(x)` prohíbe `x`, diferente de ausencia de evidencia. `seq(a,b)` ordena; `par(a,b)` expresa concurrencia. `ri("id")` identifica contenido compartido, cuya resolución es responsabilidad del receptor. `opq("...")` conserva datos exactos.

Ejemplo: `seq(sen(ri("error:1")),nar(ri("error:1")),sel(ri("tests:1")))`.

El perfil compacto experimental C1 tiene parser y serializador propios. Por ejemplo, `sen@error:1;pro{del@archivos:originales}` equivale al AST formal `seq(sen(ri("error:1")),pro(del(ri("archivos:originales"))))`. `;` expresa secuencia; `{}` determina el alcance de una obligación, prohibición, permiso, hipótesis o negación. `@` introduce una referencia ASCII exacta. Las referencias con espacios, comillas u otros caracteres quedan fuera de C1 y deben usar el perfil formal. C1 no cambia el significado de las raíces ni se negocia automáticamente con receptores.

El diccionario está en `packages/language/dictionary.ts`. Tipos de raíz y aridad se validan; aún no existe una semántica universal para conceptos arbitrarios ni traducción libre. Los nuevos términos requieren propuesta versionada y pruebas de colisión, frecuencia, tokenización y comprensión. No se modifica ningún ID publicado. La traducción natural soporta **una sola plantilla controlada** en `es`, `en`, `pt`, `fr`, `de`, `it`, `nl`, `zh`, `ja` y `ko`. Cada texto se valida por idioma declarado, y el original se conserva en VSR para poder devolverlo sin paráfrasis. Fuera de esta plantilla falla explícitamente.
