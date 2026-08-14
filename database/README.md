# Base de datos local de FinanceAI

La instancia instalada en esta computadora es MariaDB 10.4 de XAMPP, compatible con MySQL. No se modifican otras bases.

Para crear o reparar el esquema:

```powershell
Get-Content -Raw .\database\001_schema.sql | & 'C:\xampp\mysql\bin\mysql.exe' -u root
```

Conexion de la aplicacion:

- Base: `financeai`
- Usuario: `financeai_app`
- Puerto: `3306`
- Host: `127.0.0.1`

La contraseña local se encuentra como valor predeterminado configurable en `application.properties`. En produccion debe proporcionarse mediante `DB_PASSWORD` y no guardarse en el repositorio.
