/* SmtpJS.com - v3.0.0 (Local Bundle) */
var Email = {
    send: function (a) {
        return new Promise(function (resolve, reject) {
            a.nocache = Math.floor(1e6 * Math.random() + 1);
            a.Action = "Send";
            var postData = Object.keys(a).map(function (key) {
                return encodeURIComponent(key) + "=" + encodeURIComponent(a[key]);
            }).join("&");
            Email.ajax("https://smtpjs.com/smtp.aspx", postData, function (response) {
                resolve(response);
            });
        });
    },
    ajax: function (url, data, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    callback(xhr.responseText);
                } else {
                    callback("SMTP Error: Network request failed with status " + xhr.status);
                }
            }
        };
        xhr.onerror = function () {
            callback("SMTP Error: Connection blocked (CORS / Local File Protocol Security)");
        };
        xhr.send(data);
    }
};
