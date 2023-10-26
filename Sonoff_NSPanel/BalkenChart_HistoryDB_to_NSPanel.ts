/*
 * @author 2023 @tt-tom
 * 
 * Version 1.0.1
 * 
 * Das Script erstellt die Datenpunkte und Alias für den ChartCard(Balken) im Sonoff NSPanel
 * Es liest aus der History DB Werte eines Datenpunktes und erstellt daraus das Array für die Y-Skala und
 * den Daten-String für den Grafen und der X-SKala
 * 
 * Die Y-Skala errechnet sich aus min und max Werten der ausgelesen Werte der Datenbank
 * 
 * Beispiel für die Pagedefinition
 * let CardBChartBuero = <PageChart>
{
    "type": "cardChart",
    "heading": "Heizung",
    "useColor": true,
    "subPage": false,
    "items": [<PageItem>{ 
                id: 'alias.0.NSPanel.allgemein.Charts.Heizung', 
                yAxis: 'Leistung [kWh]', 
                yAxisTicks: 'alias.0.NSPanel.allgemein.Charts.Heizung.SCALE',
                onColor: Yellow
             }]
};
 *
 *
 * Weitere Informationen findest du in der FAQ auf Github https://github.com/joBr99/nspanel-lovelace-ui/wiki
*/

const userdataPfad: string = '0_userdata.0.Charts.Heizung' // Pfad unter =_userdata.0.
const aliasPfad: string = 'alias.0.NSPanel.allgemein.Charts.Heizung'  // Pfad unter alias.0.
const sourceDP: string = 'sourceanalytix.0.alias__0__Heizung__Wärmeverbrauch__ACTUAL.currentYear.consumed.01_previousDay'; //Datenpunkt mit History-Verknüpfung 
const anzahlTage = 21;   // Anzahl der Tage die gelesen werden.
const historyInstance: string = 'history.0';

const Debug = false;

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


on({id: sourceDP, change: "any"}, async function (obj) {
    sendTo(historyInstance, 'getHistory', {
        id: sourceDP,
        options: {
            end:       Date.now(),
            round:     1,
            ignoreNull: true,
            limit:     anzahlTage,
            aggregate: 'none'
        }
    }, function (result) {
        let cardChartString = "";

            //Check history items for requested hours
           for (var j = 0; j < result.result.length; j++) {
                let valueDate = new Date(result.result[j].ts - 86400000);
                let value = result.result[j].val;

                if (Debug) console.log(valueDate + '  ' + valueDate.getDate()); 

                switch (j) {

                    case 0:
                    case 7:
                    case 14:
                    case 21:
                        cardChartString += value + '^' + valueDate.getDate() + '~';
                        break;
                    default:
                        cardChartString += value + '~';
                        break;
                }
            }
        
        cardChartString = cardChartString.substring(0,cardChartString.length-1);
        if (existsState(valueDP) == false ) { 
            createState(valueDP, cardChartString, true, { type: 'string' });
        } else {
            setState(valueDP, cardChartString, true);
        }
        
        if (Debug) console.log(cardChartString); 
    }); 
});
