/*
 *
 * @author 2023 tt-tom
 *
 * Dieses Skript dient zur freien Verwendung in ioBroker zur Überprüfung der Internetgeschwindkeit mit Hilfe von Speedtest.
 * im ioBrocker Forum gibt es hier den pasenden Beitrag https://forum.iobroker.net/topic/48700
 * 
 * Der Ursprung zu diesem Script stammt von Stephan Kreyenborg 
 * Skript Version:    1.3
 * Erstell-Datum:    29. November 2021
 * 
 * 
 */

// Datenpunkt in 0_userdata.0. der Stammdatenordner des Script ist "Speedtest"
const DP_userdata = '0_userdata.0.';

// umrechnungen der Datenmengen
const Mbit_byte: number = 131072;
const MB_byte: number = 1048576;
const MB_bit: number =8388608;

// Favorisierter Server
// Liste: https://www.speedtest.net/speedtest-servers.php
var fav_server = 0; // 53128 Wolfsburg

function speedtest() {

    // Kommando für den Speedtest
    var kommando = "/usr/bin/speedtest -f json --accept-license --accept-gdpr";
    if (fav_server > 0) {
        kommando = kommando + " -s " + fav_server;
        console.log("Speedtest mit Server " + fav_server + " gestartet! Der Test dauert zwischen 10 - 20 Sekunden!");
    } else {
        console.log("Speedtest gestartet! Der Test dauert zwischen 10 - 20 Sekunden!");
    }
    exec(kommando,
        function (error, stdout) {
            if (error) {
                console.log('Speedtest konnte nicht ausgeführt werden! ' + error, 'error');
                return;
            } else {
                //console.log(stdout)
                aktualisiere_datenpunkt(stdout)
                console.log('Speedtest durchgeführt. Ergebnisse: Download: ' + parseFloat((JSON.parse(stdout).download.bandwidth / Mbit_byte).toFixed(2)) + ' Mbit/s | Upload: ' + parseFloat((JSON.parse(stdout).upload.bandwidth / Mbit_byte).toFixed(2)) + ' MBit/s | Ping: ' + JSON.parse(stdout).ping.latency + ' ms');
            }
        });
}

function aktualisiere_datenpunkt(JSON_Daten: string) {
    setState(DP_userdata + 'Speedtest.JSON_OUTPUT', JSON_Daten, true);
    setState(DP_userdata + 'Speedtest.Ergebnisse.Ping', JSON.parse(JSON_Daten).ping.latency, true);
    setState(DP_userdata + 'Speedtest.Ergebnisse.Jitter', JSON.parse(JSON_Daten).ping.jitter, true);
    setState(DP_userdata + 'Speedtest.Ergebnisse.Download_MBit', parseFloat((JSON.parse(JSON_Daten).download.bandwidth / Mbit_byte).toFixed(2)), true);
    setState(DP_userdata + 'Speedtest.Ergebnisse.Upload_MBit', parseFloat((JSON.parse(JSON_Daten).upload.bandwidth / Mbit_byte).toFixed(2)), true);
    setState(DP_userdata + 'Speedtest.Ergebnisse.Download_MB', parseFloat((JSON.parse(JSON_Daten).download.bandwidth / MB_byte).toFixed(2)), true);
    setState(DP_userdata + 'Speedtest.Ergebnisse.Upload_MB', parseFloat((JSON.parse(JSON_Daten).upload.bandwidth / MB_byte).toFixed(2)), true);
    setState(DP_userdata + 'Speedtest.Ergebnisse.OriginalDownload', JSON.parse(JSON_Daten).download.bandwidth, true);
    setState(DP_userdata + 'Speedtest.Ergebnisse.OriginalUpload', JSON.parse(JSON_Daten).upload.bandwidth, true);
    setState(DP_userdata + 'Speedtest.ISP', JSON.parse(JSON_Daten).isp, true);
    setState(DP_userdata + 'Speedtest.IP', JSON.parse(JSON_Daten).interface.externalIp, true);
    setState(DP_userdata + 'Speedtest.Ergebnisse.URL', JSON.parse(JSON_Daten).result.url, true);
    setState(DP_userdata + 'Speedtest.Ergebnisse.ID', JSON.parse(JSON_Daten).result.id, true);
    setState(DP_userdata + 'Speedtest.Test.Server.ServerID', JSON.parse(JSON_Daten).server.id, true);
    setState(DP_userdata + 'Speedtest.Test.Server.ServerIP', JSON.parse(JSON_Daten).server.ip, true);
    setState(DP_userdata + 'Speedtest.Test.Server.Name', JSON.parse(JSON_Daten).server.name, true);
    setState(DP_userdata + 'Speedtest.Test.Server.Stadt', JSON.parse(JSON_Daten).server.location, true);
    setState(DP_userdata + 'Speedtest.Test.Server.Land', JSON.parse(JSON_Daten).server.country, true);
    setState(DP_userdata + 'Speedtest.Test.Server.URL', JSON.parse(JSON_Daten).server.host, true);
    setState(DP_userdata + 'Speedtest.Test.Daten.Download', parseFloat((JSON.parse(JSON_Daten).download.bytes / MB_byte).toFixed(2)), true);
    setState(DP_userdata + 'Speedtest.Test.Daten.Upload', parseFloat((JSON.parse(JSON_Daten).upload.bytes / MB_byte).toFixed(2)), true);
    setState(DP_userdata + 'Speedtest.Test.Daten.OriginalDownload', JSON.parse(JSON_Daten).download.bytes, true);
    setState(DP_userdata + 'Speedtest.Test.Daten.OriginalUpload', JSON.parse(JSON_Daten).upload.bytes, true);
    setState(DP_userdata + 'Speedtest.Test.Daten.DauerDownload', parseFloat((JSON.parse(JSON_Daten).download.elapsed / 1000).toFixed(2)), true);
    setState(DP_userdata + 'Speedtest.Test.Daten.DauerUpload', parseFloat((JSON.parse(JSON_Daten).upload.elapsed / 1000).toFixed(2)), true);
    setState(DP_userdata + 'Speedtest.Test.Daten.Letzter_Speedtest', formatDate(new Date(), "TT.MM.JJJJ SS:mm:ss"), true);



}

// Erstelle die benötigten Datenpunkte
function datenpunkte_erstellen() {
    init_DatenpunkteErstellen(true)
    // Alle Datenpunkte erstellt. Führe ersten Speedtest aus!
    console.log('Speedtest: Erster Speedtest wird in 30 Sekunden ausgeführt!');
    setTimeout(speedtest, 30000);
}

function speedtest_erster_start() {
    console.log("Speedtest: Erster Start des Skriptes!");
    // Datenpunkte werden erstellt
    datenpunkte_erstellen();
}

// Erster Start und Initialisierung
speedtest_erster_start();

// Alle 60 Minuten einen Speedtest ausführen
schedule('*/60 * * * *', speedtest);

async function init_DatenpunkteErstellen(newCreated: boolean) {
    if (!existsObject(DP_userdata + 'Speedtest')) {
        console.log('Datenpunkte werden erstellt');
        await createStateAsync(DP_userdata + 'Speedtest.JSON_OUTPUT', '', newCreated, { name: 'JSON Ausgabe der Konsole', type: 'string', role: 'json' });
        await createStateAsync(DP_userdata + 'Speedtest.Ergebnisse.Ping', 0, newCreated, { name: 'Ping in ms', type: 'number', role: 'value', unit: 'ms' });
        await createStateAsync(DP_userdata + 'Speedtest.Ergebnisse.Jitter', 0, newCreated, { name: 'Jitter in ms', type: 'number', role: 'value', unit: 'ms' });
        await createStateAsync(DP_userdata + 'Speedtest.Ergebnisse.Download_MBit', 0, newCreated, { name: 'Download Geschwindigkeit in MBit/s', type: 'number', role: 'value', unit: 'MBit/s' });
        await createStateAsync(DP_userdata + 'Speedtest.Ergebnisse.Upload_MBit', 0, newCreated, { name: 'Upload Geschwindigkeit in MBit/s', type: 'number', role: 'value', unit: 'MBit/s' });
        await createStateAsync(DP_userdata + 'Speedtest.Ergebnisse.Download_MB', 0, newCreated, { name: 'Download Geschwindigkeit in MB/s', type: 'number', role: 'value', unit: 'MB/s' });
        await createStateAsync(DP_userdata + 'Speedtest.Ergebnisse.Upload_MB', 0, newCreated, { name: 'Upload Geschwindigkeit in MB/s', type: 'number', role: 'value', unit: 'MB/s' });
        await createStateAsync(DP_userdata + 'Speedtest.Ergebnisse.OriginalDownload', 0, newCreated, { name: 'Download Geschwindigkeit in Byte/s', type: 'number', role: 'value', unit: 'Byte/s' });
        await createStateAsync(DP_userdata + 'Speedtest.Ergebnisse.OriginalUpload', 0, newCreated, { name: 'Upload Geschwindigkeit in Byte/s', type: 'number', role: 'value', unit: 'Byte/s' });
        await createStateAsync(DP_userdata + 'Speedtest.ISP', '', newCreated, { name: 'Internet Service Provider', type: 'string', role: 'text' });
        await createStateAsync(DP_userdata + 'Speedtest.IP', '', newCreated, { name: 'externe IP', type: 'string', role: 'text' });
        await createStateAsync(DP_userdata + 'Speedtest.Ergebnisse.URL', '', newCreated, { name: 'Adresse der Ergebnisse', type: 'string', role: 'text' });
        await createStateAsync(DP_userdata + 'Speedtest.Ergebnisse.ID', '', newCreated, { name: 'ID der Ergebnisse', type: 'string', role: 'text' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Server.ServerID', 0, newCreated, { name: 'ID des getesteten Servers', type: 'number', role: 'value' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Server.ServerIP', '', newCreated, { name: 'IP des getesteten Servers', type: 'string', role: 'text' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Server.Name', '', newCreated, { name: 'Anbieter des getesteten Servers', type: 'string', role: 'text' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Server.Stadt', '', newCreated, { name: 'Stadt des getesteten Servers', type: 'string', role: 'text' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Server.Land', '', newCreated, { name: 'Land des getesteten Servers', type: 'string', role: 'text' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Server.URL', '', newCreated, { name: 'URL des getesteten Servers', type: 'string', role: 'text' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Daten.Download', 0, newCreated, { name: 'Download Daten in MB', type: 'number', role: 'value', unit: 'MB' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Daten.Upload', 0, newCreated, { name: 'Upload Daten in MB', type: 'number', role: 'value', unit: 'MB' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Daten.OriginalDownload', 0, newCreated, { name: 'Download Daten in Byte', type: 'number', role: 'value', unit: 'Byte' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Daten.OriginalUpload', 0, newCreated, { name: 'Upload Daten in Byte', type: 'number', role: 'value', unit: 'Byte' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Daten.DauerDownload', 0, newCreated, { name: 'Dauer des Download Test', type: 'number', role: 'value', unit: 's' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Daten.DauerUpload', 0, newCreated, { name: 'Dauer des Upload Test', type: 'number', role: 'value', unit: 's' });
        await createStateAsync(DP_userdata + 'Speedtest.Test.Daten.Letzter_Speedtest', '', newCreated, { name: 'Letzter Speedtest', type: 'string', role: 'text' });
        console.log('Datenpunkte fertig');
    };
};
