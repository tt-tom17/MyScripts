
/*
 * @author 2023 @tt-tom
 *
 * Dieses Skript dient zur freien Verwendung in ioBroker.
 * Jegliche Verantwortung liegt beim Benutzer. Das Skript wurde unter Berücksichtigung der bestmöglichen Nutzung
 * und Performance entwickelt.
 * Der Entwickler versichert, das keine böswilligen Systemeingriffe im originalen Skript vorhanden sind.
 *
 * Ansprüche gegenüber Dritten bestehen nicht.
 * 
 * Version 1.0.0
 * 
 * Das Script erstellt die Datenpunkte und Alias für den ChartLCard im Sonoff NSPanel
 * Es liest aus der InFluxDB Werte eines Datenpunktes und erstellt daraus das Array für die Y-Skala und
 * den Daten-String für den Grafen und der X-SKala
 * 
 * Die Y-Skala errechnet sich aus min und max Werten der ausgelesen Werte der Datenbank
 * 
 * Beispiel für die Pagedefinition
 * let CardLChart = <PageChart>
    {
    "type": "cardLChart",
    "heading": "Außentemperatur",
    "useColor": true,
    'items': [<PageItem>{ 
                id: 'alias.0.NSPanel.allgemein.Charts.AussenTemp',
                yAxis: 'Temperatur [°C]',
                yAxisTicks: 'alias.0.NSPanel.allgemein.Charts.AussenTemp.SCALE',
                onColor: Yellow
             }]
    };
 *
 *
 * Weitere Informationen findest du in der FAQ auf Github https://github.com/joBr99/nspanel-lovelace-ui/wiki
*/


const userdataPfad: string = '0_userdata.0.Charts.AussenTemp' // Pfad unter =_userdata.0.
const aliasPfad: string = 'alias.0.NSPanel.allgemein.Charts.AussenTemp'  // Pfad unter alias.0.
const sourceDP: string = 'netatmo-crawler.0.stationData.1.temperature'/*stationData 1 temperature*/;

const zeitSpanne: number = 24;   // Zeitspanne in Stunden, die visualisiert werden
const xAchseStrich: number = 60;   // Zeit in Minuten, nachdem die X-Achse einen Strich bekommt
const xAchseLabel: number = 240;  // Zeit in Minuten, nachdem x-Achse Wert bekommt


const InfluxInstance: string = 'influxdb.0';


const Debug = true;


async function Init_Datenpunkte() {
    try {
        if (existsObject(userdataPfad) == false) {
            console.log('Datenpunkte werden angelegt')
            let deviceName: Array<string> = userdataPfad.split('.')
            await createStateAsync(userdataPfad + '.Werte', '', { name: 'SensorWerte', desc: 'Sensor Werte [~<time>:<value>]*', type: 'string', role: 'value' });
            await createStateAsync(userdataPfad + '.Scale', '', { name: 'YScaleGrid', desc: 'Skala Y Achse', type: 'string', role: 'value' });
            setObject(aliasPfad, { type: 'channel', common: { role: 'info', name: { de: deviceName[deviceName.length], en: deviceName[deviceName.length] } }, native: {} });
            await createAliasAsync(aliasPfad + '.ACTUAL', userdataPfad + '.Werte', true, <iobJS.StateCommon>{ type: 'string', role: 'value', name: { de: 'Sensor Werte', en: 'Sensor Values' } });
            await createAliasAsync(aliasPfad + '.SCALE', userdataPfad + '.Scale', true, <iobJS.StateCommon>{ type: 'string', role: 'value', name: { de: 'Skala Y Achse', en: 'Scale Y Axis' } });
            console.log('Fertig')
        } else {
            console.log('Datenpunkte vorhanden')
        };
    } catch (err) {
        console.warn('error at function Init_Datenpunkte: ' + err.message);
    };
};
Init_Datenpunkte();

on({ id: sourceDP, change: 'any' }, async function (obj) {
let ticksAndLabels: string = '';
let coordinates: string = '';
let list: Array<string> = [];
let scale: Array<number> = [];

    let query = [
        'from(bucket: "iobroker")',
        '|> range(start: -' + zeitSpanne + 'h)',
        '|> filter(fn: (r) => r["_measurement"] == "' + sourceDP + '")',
        '|> filter(fn: (r) => r["_field"] == "value")',
        '|> drop(columns: ["from", "ack", "q"])',
        '|> aggregateWindow(every: 1h, fn: last, createEmpty: false)',
        '|> map(fn: (r) => ({ r with _rtime: int(v: r._time) - int(v: r._start)}))',
        '|> yield(name: "_result")'].join('');

    if (Debug) console.log('Query: ' + query);

    sendTo(InfluxInstance, 'query', query, function (result) {
        if (result.error) {
            console.error(result.error);
        } else {
            // show result
            if (Debug) console.log(result);

            for (let r = 0; r < result.result.length; r++) {
                for (let i = 0; i < result.result[r].length; i++) {
                    let time: number = Math.round(result.result[r][i]._rtime / 1000 / 1000 / 1000 / 60);
                    let value: number = Math.round(result.result[r][i]._value * 10);
                    list.push(time + ":" + value);
                    scale.push(value);
                }

                coordinates = list.join("~");

                if (Debug) console.log(coordinates);
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
            if (Debug) console.log('Iterate from ' + tsYesterday + ' to ' + ts + ' stepsize=' + (xAchseStrich * 60));
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

            if (Debug) console.log('Ticks & Label: ' + ticksAndLabels);
            if (Debug) console.log('Coordinates: ' + coordinates);

        let scaleList: Array<string> = [];
        let max = 0;
        let min = 0;
        let intervall = 0;

        max = Math.max(...scale);
        min = Math.min(...scale);

        if (Debug) console.log('min Wert ' + min);
        if (Debug) console.log('max Wert ' + max);

        intervall = max - min;
        intervall = Math.round(intervall / 4);
        scaleList.push(String(min));

        for (let count = 0; count < 4; count++) {
            min = Math.round(min + intervall);
            scaleList.push(String(min));
        }


            setState(userdataPfad + '.Werte', ticksAndLabels + '~' + coordinates, true);
            setState(userdataPfad + '.Scale', "[" + scaleList.join(",") + "]", true);

        },
        1500
    );
});