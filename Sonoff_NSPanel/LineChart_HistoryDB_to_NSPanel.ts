/*
 * @author 2023 @tt-tom
 * 
 * Version 1.0.1
 * 
 * Das Script erstellt die Datenpunkte und Alias für den ChartLCard im Sonoff NSPanel
 * Es liest aus der History DB Werte eines Datenpunktes und erstellt daraus das Array für die Y-Skala und
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
            console.log('Datenpunkte werden angelegt')
            let deviceName: Array<string> = userdataPfad.split('.')
            await createStateAsync(userdataPfad + '.Werte', '', { name: 'SensorWerte', desc: 'Sensor Werte [~<time>:<value>]*', type: 'string', role: 'value'});
            await createStateAsync(userdataPfad + '.Scale', '', { name: 'YScaleGrid', desc: 'Skala Y Achse', type: 'string', role: 'value'});
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
        let ticksAndLabels: string = '';
        let coordinates: string = '';
        let cardLChartValue: string = '';
        let cardLChartScale: string = '';


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
        let scale: Array<number> = [];
        let offSetTime = Math.round(result.result[0].ts / 1000);
        let counter = Math.round((result.result[result.result.length - 1].ts / 1000 - offSetTime) / maxX);
        for (let i = 0; i < result.result.length; i++) {
            let time: number = Math.round(((result.result[i].ts / 1000) - offSetTime) / counter);
            let value: number = Math.round(result.result[i].val * 10);
            if ((value != null) && (value != 0)) {
                list.push(time + ':' + value);
                scale.push(value)
            }
        }

        coordinates = list.join("~");
        cardLChartValue = ticksAndLabels + '~' + coordinates;

        let scaleList: Array<string> = [];
        let max = 0;
        let min = 0;
        let intervall = 0;

        max = Math.max(...scale);
        min = Math.min(...scale);

        if (Debug) console.log(min);
        if (Debug) console.log(max);

        intervall = max - min;
        intervall = Math.round(intervall / 4);
        scaleList.push(String(min));

        for (let count = 0; count < 4; count++) {
            min = Math.round(min + intervall);
            scaleList.push(String(min));
        }

        cardLChartScale = "[" + scaleList.join(",") + "]"


        setState(userdataPfad + '.Werte', cardLChartValue, true);
        setState(userdataPfad + '.Scale', cardLChartScale, true);

        if (Debug) console.log(cardLChartScale);
        if (Debug) console.log(cardLChartValue);

    });
});
