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
 * Das Script list aus dem HistoryDB daten Aus und ersetllt ein JSON für den BarChart von Materialdesign
 * es wird ein Ordner unter 0_userdata.0. angelegt der mit dem Widget verknüft wird
 * der Trigger ist auf ein Datenpunkt gesetzt, der mit einem String vom Widget "Select - materialdesign" gefüllt wird


        '30 seconds': 30000,
        '1 minute': 60000,
        '2 minutes': 120000,
        '5 minutes': 300000,
        '10 minutes': 600000,
        '30 minutes': 1800000,
        '1 hour': 3600000,
        '2 hours': 7200000,
        '4 hours': 14400000,
        '8 hours': 28800000,
        '12 hours': 43200000,
        '1 day': 86400000,
        '2 days': 172800000,
        '3 days': 259200000,
        '7 days': 604800000,
        '14 days': 1209600000,
        '1 month': 2628000000,
        '2 months': 5256000000,
        '3 months': 7884000000,
        '6 months': 15768000000,
        '1 year': 31536000000,
        '2 years': 63072000000


*/


const sourceDP_Day = 'sourceanalytix.0.alias__0__Stromzaehler__Daten__Zaehlerstand.currentYear.consumed.01_previousDay';
const sourceDP_Week = 'sourceanalytix.0.alias__0__Stromzaehler__Daten__Zaehlerstand.currentYear.consumed.02_previousWeek';
const sourceDP_Month = 'sourceanalytix.0.alias__0__Stromzaehler__Daten__Zaehlerstand.currentYear.consumed.03_previousMonth';
const triggerDP = '0_userdata.0.Visualisierung.view_heizung.Zeitintervall_Strom'
const valueDP = '0_userdata.0.Visualisierung.view_heizung.BalkenChartStrom';
const historyInstance = 'history.0';
const Debug = false;

let zeitraum: number = 0;
let source: string = '';

createState(valueDP, "", {
    name: 'BalkenChartStrom',
    desc: 'JSON Sting for Widget',
    type: 'string',
    role: 'value',
});

on({ id: triggerDP, change: "any" }, async function (obj) {
    if (Debug) console.log('Trigger Wert ' + obj.state.val)

    switch (obj.state.val) {
        case '7 days':
            zeitraum = 604800000;
            source = sourceDP_Day;
            break;

        case '14 days':
            zeitraum = 1209600000;
            source = sourceDP_Day;
            break;

        case '1 month':
            zeitraum = 2628000000;
            source = sourceDP_Day;
            break;

        case '3 months':
            zeitraum = 7884000000;
            source = sourceDP_Week;
            break;

        case '6 months':
            zeitraum = 15768000000;
            source = sourceDP_Week;
            break;

        case '1 year':
            zeitraum = 31536000000;
            source = sourceDP_Month;

        default:
            console.log('keine zeitraum selektiert')
            break;
    };

    datenAbruf_HistoryDB(source, zeitraum)
});

async function datenAbruf_HistoryDB(sourceDP: string, range: number) {
    let end = new Date().getTime();

    sendTo(historyInstance, 'getHistory', {
        id: sourceDP,
        options: {
            end: end,
            start: end - range,
            round: 1,
            aggregate: 'none'
        }
    }, function (result) {
        let cardChartString: string = '[';

        for (var j = 0; j < result.result.length; j++) {
            let valueDate = new Date(result.result[j].ts - 86400000);
            let value = result.result[j].val;

            if (Debug) console.log(value);
            if (Debug) console.log(valueDate + '  ' + valueDate.getDate());
            if (Debug) console.log(valueDate + '  ' + (valueDate.getMonth() + 1));


            if (value != null && formatDate(valueDate,'hh:mm')== '00:00') {
                cardChartString += '{"value": "' + value + '", "label": "' + valueDate.getDate() + '.' + (valueDate.getMonth() + 1) + '"},';
            };


        };

        cardChartString = cardChartString.substring(0, cardChartString.length - 1);
        cardChartString += ']'
        if (existsState(valueDP) == false) {
            createState(valueDP, cardChartString, true, { type: 'string' });
        } else {
            setState(valueDP, cardChartString, true);
        }

        if (Debug) console.log(cardChartString);
    });
};

