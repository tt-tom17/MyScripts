
/**
 * @author 2023 @tt-tom
 * 
 * Version 1.0.4
 * 
 * Changelog
 * - 31.01.24 - Berechnung der Werte für die y-Achse werden im NSPanel.ts Script durchgeführt
 * 
 * Das Script erstellt die Datenpunkte und Alias für den ChartLCard im Sonoff NSPanel
 * Es liest aus der InFluxDB Werte eines Datenpunktes und erstellt daraus das Array für die Y-Skala und
 * den Daten-String für den Grafen und der X-SKala
 * 
 * Die Y-Skala errechnet sich aus min und max Werten der ausgelesen Werte der Datenbank
 * 
 * Bei Nutzung einer AliasID im in den Influx-Einstellungen zum Datenpunkt ist für das Measurement in der 
 * Zusammenstellung des Querys die Konstante 'aliasInfluxDP' einzusetzen.
 * 
 * Beispiel für die Pagedefinition
 * let CardLChart:PageType =
 *   {
 *   "type": "cardLChart",
 *   "heading": "Außentemperatur",
 *   'items': [{ 
 *               id: 'alias.0.NSPanel.allgemein.Charts.AussenTemp',
 *               yAxis: 'Temperatur [°C]',
 *               onColor: Yellow
 *            }];
 *   };
 *
 *
 * Weitere Informationen findest du in der FAQ auf Github https://github.com/joBr99/nspanel-lovelace-ui/wiki
*/


const userdataPfad: string = '0_userdata.0.Charts.AussenTemp' // Pfad unter =_userdata.0.
const aliasPfad: string = 'alias.0.NSPanel.allgemein.Charts.AussenTemp'  // Pfad unter alias.0.
const sourceDP: string = 'netatmo-crawler.0.stationData.1.temperature'/*stationData 1 temperature*/;
const aliasInfluxDP: string = 'Wetter.Temperatur' // zu nutzen wenn im InfluxAdapter ein Alias vergeben wurde

const zeitSpanne: number = 24;   // Zeitspanne in Stunden, die visualisiert werden
const xAchseStrich: number = 60;   // Zeit in Minuten, nachdem die X-Achse einen Strich bekommt
const xAchseLabel: number = 240;  // Zeit in Minuten, nachdem x-Achse Wert bekommt


const InfluxInstance: string = 'influxdb.0';
const BucketName: string = 'storage_short';


const Debug = false;


async function Init_Datenpunkte() {
    try {
        if (existsObject(userdataPfad) == false) {
            log('Datenpunkte werden angelegt')
            let deviceName: Array<string> = userdataPfad.split('.')
            await createStateAsync(userdataPfad + '.Werte', '', { name: 'SensorWerte', desc: 'Sensor Werte [~<time>:<value>]*', type: 'string', role: 'value' });
            await createStateAsync(userdataPfad + '.Scale', '', { name: 'YScaleGrid', desc: 'Skala Y Achse', type: 'string', role: 'value' });
            setObject(aliasPfad, { type: 'channel', common: { role: 'info', name: { de: deviceName[deviceName.length], en: deviceName[deviceName.length] } }, native: {} });
            await createAliasAsync(aliasPfad + '.ACTUAL', userdataPfad + '.Werte', true, <iobJS.StateCommon>{ type: 'string', role: 'value', name: { de: 'Sensor Werte', en: 'Sensor Values' } });
            await createAliasAsync(aliasPfad + '.SCALE', userdataPfad + '.Scale', true, <iobJS.StateCommon>{ type: 'string', role: 'value', name: { de: 'Skala Y Achse', en: 'Scale Y Axis' } });
            log('Fertig')
        } else {
            log('Datenpunkte vorhanden')
        };
    } catch (err) {
        log('error at function Init_Datenpunkte: ' + err.message, 'warn');
    };
};
Init_Datenpunkte();

on({ id: sourceDP, change: 'any' }, async function (obj) {
let ticksAndLabels: string = '';
let coordinates: string = '';
let list: Array<string> = [];

    let query = [
        'from(bucket: "' + BucketName + '")',
        '|> range(start: -' + zeitSpanne + 'h)',
        '|> filter(fn: (r) => r["_measurement"] == "' + sourceDP + '")', // bei Nutzung der Alias-ID -> sourceDP durch aliasInfluxDP ersetzen
        '|> filter(fn: (r) => r["_field"] == "value")',
        '|> drop(columns: ["from", "ack", "q"])',
        '|> aggregateWindow(every: 1h, fn: last, createEmpty: false)',
        '|> map(fn: (r) => ({ r with _rtime: int(v: r._time) - int(v: r._start)}))',
        '|> yield(name: "_result")'].join('');

    if (Debug) log('Query: ' + query);

    sendTo(InfluxInstance, 'query', query, function (result) {
        if (result.error) {
            log('sendTo: ' + result.error, 'error');
        } else {
            // show result
            if (Debug) log(result);

            for (let r = 0; r < result.result.length; r++) {
                for (let i = 0; i < result.result[r].length; i++) {
                    let time: number = Math.round(result.result[r][i]._rtime / 1000 / 1000 / 1000 / 60);
                    let value: number = Math.round(result.result[r][i]._value * 10);
                    list.push(time + ":" + value);
                }

                coordinates = list.join("~");

                if (Debug) log(coordinates);
            }
        }
    });

    let timeOut = setTimeout(
        function () {
            let ticksAndLabelsList: Array<string> = [];
            let date = new Date();
            date.setMinutes(0, 0, 0);
            let ts: number = Math.round(date.getTime() / 1000);
            let tsYesterday: number = ts - (zeitSpanne * 3600);
            if (Debug) log('Iterate from ' + tsYesterday + ' to ' + ts + ' stepsize=' + (xAchseStrich * 60));
            for (let x = tsYesterday, i = 0; x < ts; x += (xAchseStrich * 60), i += xAchseStrich) {
                if ((i % xAchseLabel))
                    ticksAndLabelsList.push(String(i));
                else {
                    let currentDate = new Date(x * 1000);
                    // Hours part from the timestamp
                    let hours = "0" + String(currentDate.getHours());
                    // Minutes part from the timestamp
                    let minutes = "0" + String(currentDate.getMinutes());
                    let formattedTime = hours.slice(-2) + ':' + minutes.slice(-2);

                    ticksAndLabelsList.push(String(i) + "^" + formattedTime);
                }
            }
            ticksAndLabels = ticksAndLabelsList.join("+");

            if (Debug) log('Ticks & Label: ' + ticksAndLabels);
            if (Debug) log('Coordinates: ' + coordinates);

            setState(userdataPfad + '.Werte', ticksAndLabels + '~' + coordinates, true);

        1500});
});
