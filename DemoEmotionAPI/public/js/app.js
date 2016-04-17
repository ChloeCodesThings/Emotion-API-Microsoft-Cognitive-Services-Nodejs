$(document).ready(function () {
    $form = $("#frmUploadImage"), $inputFile = $('#inputImage');
    
    
    $form.on("submit", function (e) {
        e.preventDefault();
        if ($inputFile.get(0).files.length === 0) {
            alert("No ha seleccionado ninguna imagen");
            return false;
        }
        var formData = new FormData($(this)[0]);
        //enviamos la imagen cargada por el usuario al servidor
        $.ajax({
            url: '/upload',
            type: 'POST',
            data: formData,
            async: false,
            cache: false,
            contentType: false,
            processData: false,
            success: function (data) {
                console.log(data);
                previewImage(data);//visualizamos la imagen si todo sale bien 
            }
        });
    });
    
    function drawPoint(x, y, ctx) {
        ctx.beginPath(); ctx.arc(x, y, 2, 0, 2 * Math.PI, true); ctx.fill();
    }
    
    function previewImage(data) {
        var c = document.getElementById("canvasLoadImage");
        var ctx = c.getContext("2d");
        var img = new Image();
        img.onload = function () {
            //obtenemos las dimensiones de la imagen
            c.width = this.width;
            c.height = this.height;
            //dibujamos la imagen en nuestro canvas
            ctx.drawImage(this, 0, 0);
            //lista de caras detectadas dentro de la imagen
            var faces = JSON.parse(data.info);
            $.each(faces, function (index, face) {
                //obtenemos la posisción de cada cara dentro de nuestra imagen
                var rec = face.faceRectangle;
                ctx.fillStyle = '#DF0174';
                ctx.globalAlpha = 0.1;
                ctx.fillRect(rec.left, rec.top, rec.width, rec.height);
                ctx.globalAlpha = 1;
                drawPoint(rec.left, rec.top, ctx);
                drawPoint(rec.left + rec.width, rec.top, ctx);
                drawPoint(rec.left, rec.top + rec.height, ctx);
                drawPoint(rec.left + rec.width, rec.top + rec.height, ctx);
                ctx.strokeStyle = 'red';
                ctx.restore();
                ctx.fillStyle = '#DF0174';
                ctx.font = "20px Arial";
                ctx.stroke();
                var max, maxScore;
                $.each(face.scores, function (key, value) {
                    if (!max || parseFloat(value) > parseFloat(max)) {
                        max = parseFloat(value); maxScore = key;
                    }
                });
                ctx.fillText(maxScore, rec.left + (rec.width / 2), rec.top + (rec.height / 2));

            });
        };
        img.src = data.uri;//url de la imagen en el servidor

    }
});