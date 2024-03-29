/*
 * @author 2023 @tt-tom
 * 
 * Version 1.0.2
 * 
 * Changelog
 * 
 * - 31.01.24 - Berechnung der Werte für die y-Achse werden im NSPanel.ts Script durchgeführt
 * 
 * Das Script erstellt die Datenpunkte und Alias für den ChartLCard im Sonoff NSPanel
 * Es liest aus der History DB Werte eines Datenpunktes und erstellt daraus das Array für die Y-Skala und
 * den Daten-String für den Grafen und der X-SKala
 * 
 * Die Y-Skala errechnet sich aus min und max Werten der ausgelesen Werte der Datenbank
 * 
 * Beispiel für die Pagedefinition
 * let CardLChart.PageType =
    {
    "type": "cardLChart",
    "heading": "Außentemperatur",
    "useColor": true,
    'items': [{ 
                id: 'alias.0.NSPanel.allgemein.Charts.AussenTemp',
                yAxis: 'Temperatur [°C]',
                onColor: Yellow
             }];
    };
 *
 *
 * Weitere Informationen findest du in der FAQ auf Github https://github.com/joBr99/nspanel-lovelace-ui/wiki
*/

const userdataPfad: string = '0_userdata.0.Charts.AussenTemp' // Pfad unter =_userdata.0.
const aliasPfad: string = 'alias.0.NSPanel.allgemein.Charts.AussenTemp'  // Pfad unter alias.0.
const sourceDP: string = 'netatmo-crawler.0.stationData.1.temperature'/*stationData 1 temperature*/;
const zeitSpanne = 24;   // Zeitspanne in Stunden, die visualisiert werden
const xAchseStrich = 60;   // Zeit in Minuten, nachdem die X-Achse einen Strich bekommt
const xAchseWert = 240;  // Zeit in Minuten, nachdem x-Achse Wert bekommt
const historyInstance: string = 'history.0';

const Debug = false;

const maxX = 1420;  // max Länge der X Achse, ein vielfaches von xAchseStrich
const limitMeasurements = 35;

async function Init_Datenpunkte() {
    try {
        if (existsObject(userdataPfad) == false) {
            log('Datenpunkte werden angelegt')
            let deviceName: Array<string> = userdataPfad.split('.')
            await createStateAsync(userdataPfad + '.Werte', '', { name: 'SensorWerte', desc: 'Sensor Werte [~<time>:<value>]*', type: 'string', role: 'value'});
            setObject(aliasPfad, { type: 'channel', common: { role: 'info', name: { de: deviceName[deviceName.length], en: deviceName[deviceName.length] } }, native: {} });
            await createAliasAsync(aliasPfad + '.ACTUAL', userdataPfad + '.Werte', true, <iobJS.StateCommon>{ type: 'string', role: 'value', name: { de: 'Sensor Werte', en: 'Sensor Values' } });
            log('Fertig')
        } else {
            log('Datenpunkte vorhanden')
        };
    } catch (err) {
        log('error at function Init_Datenpunkte: ' + err.message, 'warn');
    };
};
Init_Datenpunkte();


on({ id: sourceDP, change: "any" }, async function (obj) {
    sendTo(historyInstance, 'getHistory', {
        id: sourceDP,
        options: {
            start: Date.now() - (zeitSpanne * 60 * 60 * 1000), //Zeit in ms: Stunden * 60m * 60s * 1000ms
            end: Date.now(),
            count: limitMeasurements,
            limit: limitMeasurements,
            aggregate: 'average'
        }
    }, function (result) {
        if (result.error){
            log('Abfragefehler: ' + result.error, 'error');
        }else{
        let ticksAndLabels: string = '';
        let coordinates: string = '';
        let cardLChartValue: string = '';


        let ticksAndLabelsList: Array<string> = []
        let date = new Date();
        date.setMinutes(0, 0, 0);
        let ts = Math.round(date.getTime() / 1000);
        let tsYesterday = ts - (zeitSpanne * 3600);

        for (let x = tsYesterday, i = 0; x < ts + 60; x += (xAchseStrich * 60), i += xAchseStrich) {
            if (i % xAchseWert) {
                ticksAndLabelsList.push(String(i));
            } else {
                let currentDate = new Date(x * 1000);
                // Hours part from the timestamp
                let hours = "0" + currentDate.getHours();
                // Minutes part from the timestamp
                let minutes = "0" + currentDate.getMinutes();
                // Seconds part from the timestamp
                let seconds = "0" + currentDate.getSeconds();
                let formattedTime = hours.slice(-2) + ':' + minutes.slice(-2);
                ticksAndLabelsList.push(String(i) + "^" + formattedTime);
            }
        }
        ticksAndLabels = ticksAndLabelsList.join("+");

        let list: Array<string> = [];
        let offSetTime = Math.round(result.result[0].ts / 1000);
        let counter = Math.round((result.result[result.result.length - 1].ts / 1000 - offSetTime) / maxX);
        for (let i = 0; i < result.result.length; i++) {
            let time: number = Math.round(((result.result[i].ts / 1000) - offSetTime) / counter);
            let value: number = Math.round(result.result[i].val * 10);
            if ((value != null) && (value != 0)) {
                list.push(time + ':' + value);
            }
        }

        coordinates = list.join("~");
        cardLChartValue = ticksAndLabels + '~' + coordinates;

        setState(userdataPfad + '.Werte', cardLChartValue, true);

        if (Debug) log(cardLChartValue);
        }
    });
});
