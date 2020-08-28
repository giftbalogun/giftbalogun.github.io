var currentPrice = new XMLHttpRequest();

currentPrice.open('GET', 'https://api.gdax.com/products/BTC-USD/book', true);
currentPrice.onreadystatechange = function () {
    if (currentPrice.readyState == 4) {
        var ticker = JSON.parse(currentPrice.responseText);
        var price = ticker.bids[0][0];
        document.getElementById('btc').innerHTML = '1 BTC = ' + "$" + price;
    };
};
currentPrice.send();

var tx, keys, fee = 0.0001,
    mellt;

function balance_cb(amount) {
    if (isNaN(amount)) amount = '?';
    else amount = js.format_money(amount, 8);

    $('balance').innerHTML =
        "<span title='click to refresh' onclick='refresh(true);' style='cursor:pointer'>Balance: <b id=amt>" +
        amount + "</b> BTC</span>";
    $('transactions').innerHTML = "<a class='button-secondary' href='" + backend.adr_page + keys.adr +
        "' target=_blank><span>transactions</span></a>";
}

function refresh(set_amount) {
    if (set_amount) $('amt').innerHTML = '?';

    backend.get_balance(keys.adr, balance_cb);
}


function open_wallet() {
    var pass = js.trim($('passphrase').value);
    var userme = document.getElementById('username').value;

    if (pass.length < 1) return;

    keys = btc.get_keys(pass);

    $('pass_form').hide();
    $('showup').hide();
    $('send_form').show();
    $('close').show();
    $('to').focus();

    $('adr').innerHTML = "<b>" + keys.adr +
        "</b>&ndash; <a href='javascript:show_wif()'><span id='key_action'>Show</span> my private key</a><br><span id=wif></span>";

    $('status').innerHTML = 'Network Fee: ' + fee;

    refresh();
    setInterval(refresh, 60000);

    // var blob = new Blob(["This is your login Detail----", pass, "-The Space-", userme], {
    // type: "text/plain;charset=utf-8"
    // });
    // saveAs(blob, "work1.txt");
}

function show_wif() {
    if ($('wif').innerHTML == '') {
        $('wif').innerHTML = keys.wif;
        $('key_action').innerHTML = 'Hide';
    } else {
        $('wif').innerHTML = '';
        $('key_action').innerHTML = 'Show';
    }
}

function broadcast_cb(res) {
    if (res === '') {
        $('to').value = '';
        $('amount').value = '';
        $('status').innerHTML = '<a target="_blank" href="https://blockchain.info/tx/' + tx.txid() +
            '" target=_blank>Transaction</a> sent.';
    } else $('status').innerHTML = 'Error: ' + res;

    tx = null;
    js.enable_form('send_form', true);
    setTimeout(refresh, 1000);
}

function broadcast() {
    var status = $('status');
    status.innerHTML = 'Signing tx...';

    var signed = tx.sign(keys);

    status.innerHTML = 'Broadcasting...';

    backend.send(signed, broadcast_cb);
}

function unspent_cb(utxo) {
    if (utxo !== false) {
        var total = tx.add_unspent(utxo),
            err = '';

        //var tx_total = tx.amount + fee;

        var tx_total = tx.amount;

        if (total >= tx_total) {
            var change = total - tx_total;

            if (change > 0.000001) tx.add_output(keys.adr, change);

            setTimeout(broadcast, 300);

            return;
        } else err = 'Not enough money! Need ' + js.format_money(tx_total - total, 8) + ' BTC more.';
    } else err = 'Failed to get unspent outputs!';

    tx = null;
    js.enable_form('send_form', true);
    $('status').innerHTML = err;
}

function send_tx() {
    var dst = js.trim($('to').value),
        amount = parseFloat(js.trim($('amount').value));

    if (dst === '' || btc.decode_adr(dst) === false || isNaN(amount)) return;

    if (confirm('Send ' + amount + ' BTC to ' + dst + '?')) {
        tx = btc.new_tx();

        tx.add_output(dst, amount);

        js.enable_form('send_form', false);

        $('status').innerHTML = 'Getting unspent outputs...';

        backend.get_utxo(keys.adr, unspent_cb);
    }
}

if (!JSON || !JSON.parse) alert(
    "Your browser doesn't support native JSON decoding. This page will not work, sorry.");
else {
    var x = new XMLHttpRequest();

    if ('withCredentials' in x) {
        //            $('backend').innerHTML = backend.link;
        $('pass_form').show();
        var passphrase = $('passphrase');
        passphrase.focus();
        mellt = new Mellt();
        passphrase.addEventListener('input', function () {
            var pass = js.trim($('passphrase').value);
            var daysToCrack = mellt.CheckPassword(pass);
            var days_to_crack = $('days_to_crack');
            if (daysToCrack < 0) {
                days_to_crack.innerHTML =
                    'The password you entered is one of the world\'s most commonly used passwords. You should not be using this password.'
            } else {
                var years;
                if (daysToCrack > 365) {
                    years = Math.round(daysToCrack / 365 * 10) / 10;
                    if (years > 1000000) {
                        years = (Math.round(years / 1000000 * 10) / 10) + ' million'
                    } else if (years > 1000) {
                        years = (Math.round(years / 1000)) + ' thousand'
                    }
                }
                days_to_crack.innerHTML = 'It takes approximately ' + (daysToCrack === 1000000000 ?
                        '>' : '') +
                    (years ? years + ' years' : daysToCrack + ' days') +
                    ' to crack this password.';
            }
            days_to_crack.style.color = daysToCrack > 7 ? (days_to_crack < 30 ? '#AF7817' : 'green') :
                '#c03';
        });
    } else alert("Your browser doesn't support Cross-Origin Resource Sharing. This page will not work, sorry.");
}