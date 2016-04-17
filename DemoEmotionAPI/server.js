//1. cargamos nuestras dependencias

var Hapi = require("hapi");
var Path = require('path');
var Util = require("util");
var Fs = require('fs');
var Http = require('http');
var Request = require('request');

//2. Leemos nuestro archivo de configuración
var config = {};
Fs.readFile('./config.json', 'utf8', function (err, data) {
    config = JSON.parse(data.toString('utf8').replace(/^\uFEFF/, '')); console.log(config);
});

//3. Instanciamos nuestro objeto server, el cual se encargará de atender y administrar todas las conexiones entrantes.  
var server = new Hapi.Server();

//4. Inicializamos los modulos(plugins hapi)
server.register(require('inert'), function (err) {
    if (err) {
        console.error('Failed to load plugin:', err);
    
    }
});
//5. especificamos el puerto por el cual, nuestro objeto server atenderá conexiones
server.connection({ port : 3000 });

//6. Definimos las rutas de nuestra app
server.route({
    path: "/" , method: "GET", handler: {
        file: Path.join(__dirname, 'src/views') + "/index.html"
    }
});

//7.Contenido estatico de nuestro app (.css, .js, images etc) 
server.route({
    path: "/public/{path*}", method: "GET", handler: {
        directory: { path: Path.join(__dirname, 'public'), listing: true }
    }
});

/*
 * 8. esta función se encarga de recibir la imagen enviada por el usuario desde la pagina index.html(front-end),
 * e invokar el api de reconocimiento de expresiones de cognitive services 
*/
server.route({
    path: '/upload', 
    method: 'POST', 
    config: {
        payload: {
            //restricciones de archivo
            output: 'stream', 
            maxBytes: 1048576 * 10, /*10MB*/ 
            parse: true, 
            allow: 'multipart/form-data'
        }
    }, handler: function (request, reply) {
        var data = request.payload;
        if (data.file) {
            
            var fileName = Path.basename(data.file.hapi.filename);//obtenemos el nombre de la imagen
            var src = Path.join(__dirname, Util.format('public/upload/%s', fileName)); //definimos la ruta en donde quedará guardada la imagen en nuestro server
            //copiamos la imagen en nuestro servidor
            var stream = Fs.createWriteStream(src);
            data.file.pipe(stream);//
            //si esta operación se realiza con exito
            data.file.on('end', function (err) {
                if (err) reply(err);
                //invocamos el Api de reconocimiento de expresiones de Microsoft cognitive services
                var req = Request(
                    {
                        url: config.EMOTION_API_ENDPOINT,//url de la api 
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',//formato de envío de la imagen al api
                            'Ocp-Apim-Subscription-Key': config.EMOTION_API_KEY,//suscription API KEY
                        }
                    }, function (error, response, body) {
                        if (error) {
                            reply(error); //en caso de que se algo salga mal, retornamos al cliente dicho error 
                        } else {
                            // si todo sale bien, devolvemos al cliente la respuesta del API
                            reply({ 'uri' : Util.format('/public/upload/%s', fileName), 'info': body }).code(200);
                        }
                    });
                
                
                Fs.createReadStream(src).pipe(req);//enviamos la imagen como un stream al api
            });
        }
    }
});
//ejecutamos nuestro server
server.start(function (err) {
    if (err) { throw err; } console.log('Server running at:', server.info.uri);
});