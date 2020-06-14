const HOST = 'http://localhost:3000';
const socket = io.connect(HOST);

socket.on('logs', (data) => {
    logger(data.message);
});

function main() {
    $('#form').submit(function (e) {
        e.preventDefault();
        const url = HOST + '/articles';
        const formData = new FormData(this);
        console.log(formData);
        $.ajax({
            url: url,
            type: 'post',
            data: formData,
            processData: false,
            contentType: false,
            success: (data) => {
                logger(`Output can be downloaded here => <a href="http://localhost:3000/output/output.csv">Output file</a>`);
            }
        });
    });
}

function logger(message) {
    const logContainer = $('#logger')[0];
    logContainer.style = 'display: block';
    const messageEl = document.createElement('p');
    messageEl.innerHTML = message;
    logContainer.appendChild(messageEl);
    logContainer.scrollTop = logContainer.scrollHeight;
}

main();