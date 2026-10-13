# V.O.C.A.L.

Aplicación web de práctica oral en inglés. El frontend se sirve desde Spring Boot y el backend gestiona cuentas propias, perfiles, emparejamiento y señalización WebRTC.

## Requisitos

- Maven 3.6.3 o posterior.
- Java 21 o posterior.

## Configuración y ejecución en Windows PowerShell

```powershell
mvn spring-boot:run
```

También puedes abrir `Iniciar-VOCAL.bat`; descarga Maven en `.tools/` si hace falta, arranca el servidor y abre `http://localhost:8080`. Crea una cuenta con correo y contraseña desde la pantalla de acceso. Las contraseñas se guardan con hash BCrypt y nunca se guardan en texto plano. Las cuentas y perfiles se guardan en H2 bajo `data/`; el progreso de estudio y las métricas del prototipo siguen guardándose en el navegador.

El navegador carga SockJS y STOMP.js desde jsDelivr. La sala usa STUN público para intentar establecer WebRTC; redes restrictivas podrían requerir un servidor TURN configurado para producción.

## Estructura

- `src/main/java/com/vocal/`: código Java de la aplicación.
  - `config/`: seguridad y configuración de WebSocket.
  - `controllers/`: endpoints HTTP y señalización.
  - `models/`: entidades y repositorios de datos.
  - `services/`: lógica de emparejamiento.
- `src/main/resources/`: configuración y recursos que usa Spring Boot.
  - `application.properties`: configuración del servidor y la base de datos.
  - `static/index.html`: página principal.
  - `static/js/`: lógica de la interfaz y datos (`app.js`, `data.js`).
  - `static/css/`: estilos (`styles.css`).
  - `static/imagenes/`: imágenes (`fondo.jpg`, `logo.png`).
- `data/`: base de datos H2 local. Se conserva entre ejecuciones y no debe subirse al repositorio.
- `.tools/`: Maven local y caché de dependencias que usa el lanzador de Windows.
- `target/`: archivos generados al compilar; se pueden regenerar y no forman parte del código fuente.
- `Iniciar-VOCAL.bat`, `iniciar-vocal.ps1` y `abrir-vocal.ps1`: inicio de la aplicación y apertura automática del navegador.
- `pom.xml`: dependencias y configuración de compilación Maven.

Los directorios `data/`, `.tools/` y `target/` están excluidos de Git mediante `.gitignore`; el código fuente y los recursos se mantienen dentro de la estructura estándar de Maven.

## Despliegue para varios dispositivos

GitHub almacena el código, pero la aplicación debe ejecutarse en un servidor público. El proyecto incluye `Dockerfile` y `render.yaml` para desplegarlo en Render o en otro proveedor compatible con Docker.

Para producción usa PostgreSQL mediante estas variables:

- `SPRING_DATASOURCE_URL`: URL JDBC de PostgreSQL.
- `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD`.
- `SPRING_DATASOURCE_DRIVER=org.postgresql.Driver`.
- `VOCAL_ALLOWED_ORIGINS`: dominio HTTPS de la aplicación.
- `VOCAL_ADMIN_EMAIL`, `VOCAL_ADMIN_PASSWORD` y `VOCAL_ADMIN_NAME` para crear el superusuario.

Antes de construir la imagen ejecuta `mvn package -DskipTests`; el `Dockerfile` toma `target/vocal-0.1.0.jar`. En producción se necesita HTTPS para cámara y micrófono, y un servidor TURN si algunas redes bloquean la conexión WebRTC directa.
