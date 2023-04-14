/*
Version 3.0 von TT-Tom
das Script erstellt die Datenpunkte und Alias für den Abfallkalender im Sonoff NSPanel
Es wird der iCal Adapter benötigt und eine URL mit Terminen vom Entsorger bzw. eine .ics-Datei mit den Terminen.
gleichzeitig triggert das Script auf dem bereitgestellten JSON im iCal adapter und füllt die 0_userdata.0 Datenpunkte
Weitere Informationen findest du in der FAQ auf Github https://github.com/joBr99/nspanel-lovelace-ui/wiki
*/


const idAbfalliCal: string = 'ical.1'; // iCal Instanz zum Abfallkalender
const idUserdataAbfallVerzeichnis: string = '0_userdata.0.Abfallkalender'; // Name des Datenpunktverzeichnis unter 0_userdata.0 -> Strandard = 0_userdata.0.Abfallkalender
const idAliasPanelVerzeichnis: string = 'alias.0.NSPanel.allgemein'; //Name PanelVerzeichnis unter alias.0. Standard = alias.0.NSPanel.1
const idAliasAbfallVerzeichnis: string = 'Abfall'; //Name Verzeichnis unterhalb der idPanelverzeichnis  Standard = Abfall

const idZeichenLoeschen: number = 14; // x Zeichen links vom String abziehen, wenn vor dem Eventname noch Text steht z.B. Strassenname; Standard = 0
const idRestmuellName: string = 'Hausmüll'; // Schwarze Tonne
const idWertstoffName: string = 'Gelber Sack'; // Gelbe Tonne / Sack
const idPappePapierName: string = 'Papier';  // Blaue Tonne
const idBioabfaelleName: string = 'Biomüll'; // Braune Tonne



// ------------------------- Trigger zum füllen der 0_userdata Datenpunkte aus dem json vom ical Adapter -------------------------------

// Trigger auf iCal Instanz zur Json Tabelle
on({ id: idAbfalliCal + '.data.table', change: 'ne' }, async function () {

    try {

        let Muell_JSON: any;
        let Event2: string;
        let Color: number = 0;

        for (let i = 1; i <= 4; i++) {
            Muell_JSON = getState(idAbfalliCal + '.data.table').val;
            setState(idUserdataAbfallVerzeichnis + '.' + String(i) + '.date', getAttr(Muell_JSON, (String(i - 1) + '.date')));
            Event2 = subsequenceFromStartLast(getAttr(Muell_JSON, (String(i - 1) + '.event')), idZeichenLoeschen);
            setState(idUserdataAbfallVerzeichnis + '.' + String(i) + '.event', Event2);

            if (Debug) console.log('%' + Event2 + '%')

            if (Event2 == idRestmuellName) {
                Color = 33840;
            } else if (Event2 == idBioabfaelleName) {
                Color = 2016;
            } else if (Event2 == idPappePapierName) {
                Color = 31;
            } else if (Event2 == idWertstoffName) {
                Color = 65504;
            }
            setState(idUserdataAbfallVerzeichnis + '.' + String(i) + '.color', Color);
        }
    } catch (err) {
        console.warn('error at subscrption: ' + err.message);
    }
});

function subsequenceFromStartLast(sequence, at1) {
    var start = at1;
    var end = sequence.length;
    return sequence.slice(start, end);
};
// ------------------------------------- Ende Trigger ------------------------------------

// ------------------------------------- Funktionen zur Prüfung und Erstellung der Datenpunkte in 0_userdata.0 und alias.0 -----------------------

async function Init_Datenpunkte() {
    try {
        for (let i = 0; i <= 4; i++) {
            if (existsObject(idUserdataAbfallVerzeichnis + '.' + String(i)) == false) {
                console.log('Datenpunkt ' + idUserdataAbfallVerzeichnis + '.' + String(i) + ' werden angelegt')
                await createStateAsync(idUserdataAbfallVerzeichnis + '.' + String(i) + '.date', '', { type: 'string' });
                await createStateAsync(idUserdataAbfallVerzeichnis + '.' + String(i) + '.event', '', { type: 'string' });
                await createStateAsync(idUserdataAbfallVerzeichnis + '.' + String(i) + '.color', 0, { type: 'number' });
                setObject(idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis, { type: 'device', common: { name: { de: 'Abfall', en: 'Trash' } }, native: {} });
                setObject(DP_Alias + 'FahrplanAnzeiger.Haltestelle' + '.Abfahrt' + String(i), { type: 'channel', common: { role: 'warning', name: { de: 'Ereignis ' + String(i), en: 'Event' + String(i) } }, native: {} });
                await createAliasAsync(idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + '.' + String(i) + + '.TITLE', idUserdataAbfallVerzeichnis + '.' + String(i) + '.event', true, <iobJS.StateCommon>{ type: 'string', role: 'weather.title.short', name: { de: 'TITEL', en: 'TITLE' } });
                await createAliasAsync(idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + String(i) + '.LEVEL', idUserdataAbfallVerzeichnis + '.' + String(i) + '.color', true, <iobJS.StateCommon>{ type: 'number', role: 'value.warning', name: { de: 'LEVEL', en: 'LEVEL' } });
                await createAliasAsync(idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + String(i) + '.INFO', idUserdataAbfallVerzeichnis + '.' + String(i) + '.date', true, <iobJS.StateCommon>{ type: 'string', role: 'weather.title', name: { de: 'INFO', en: 'INFO' } });
                console.log('Fertig')
            } else {
                console.log('Datenpunkt ' + idUserdataAbfallVerzeichnis + '.' + String(i) + ' vorhanden')
            }
        }
    } catch (err) {
        console.warn('error at function Init_Datenpunkte: ' + err.message);
    }
}
Init_Datenpunkte();

// --------------------------- Ende Funktionen Datenpunkte ------------------------------------------------