
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
 * Version 1.0.2
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


const userdataPfad: string = '0_userdata.0.Charts.Heizung' // Pfad unter =_userdata.0.
const aliasPfad: string = 'alias.0.NSPanel.allgemein.Charts.Heizung'  // Pfad unter alias.0.
const sourceDP: string = 'sourceanalytix.0.alias__0__Heizung__Wärmeverbrauch__ACTUAL.currentYear.consumed.01_previousDay'/*stationData 1 temperature*/;
const aliasInfluxDP: string = 'waerme.vortag' // zu nutzen wenn im InfluxAdapter ein Alias vergeben wurde

const rangeDays: number = 21;   // Zeitspanne in Tage, die visualisiert werden



const InfluxInstance: string = 'influxdb.0';


const Debug = false;


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
    let cardChartString: string = "";
    let scale: Array<number> = [];
    let scaleList: Array<string> = [];

    let query = [
        'from(bucket: "iobmaster")',
        '|> range(start: -' + rangeDays + 'd)',
        '|> filter(fn: (r) => r["_measurement"] == "' + sourceDP + '")', // bei Nutzung der Alias-ID -> sourceDP durch aliasInfluxDP ersetzen
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
                    let valueDate = new Date(result.result[r][i].ts - 86400000);
                    let value = Math.round(result.result[r][i]._value * 10);
                    scale.push(value);

                    if (Debug) console.log('ts: '+valueDate + '  getDate: ' + valueDate.getDate());

                    switch (i) {
                        case 0:
                        case 7:
                        case 14:
                        case 21:
                            cardChartString += value + '^' + valueDate.getDate() + '~';
                            break;
                        default:
                            cardChartString += value + '~';
                            break;
                    };
                };
            };
            if (Debug) console.log('Werte: ' + cardChartString);
            cardChartString = cardChartString.substring(0, cardChartString.length - 1);
        }
    });

    let timeOut = setTimeout(
        function () {
            let max: number = 0;
            let min: number = 0;
            let intervall: number = 0;

            max = Math.max(...scale);

            if (Debug) console.log('max Wert ' + max);

            intervall = Math.round(max / 4);
            scaleList.push(String(min));

            for (let count = 0; count < 4; count++) {
                min = Math.round(min + intervall);
                scaleList.push(String(min));
            }


            setState(userdataPfad + '.Werte', cardChartString, true);
            setState(userdataPfad + '.Scale', "[" + scaleList.join(",") + "]", true);

        },
        1500
    );
});