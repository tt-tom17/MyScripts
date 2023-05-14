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
 * Version 4.0.1
 * 
 * Das Script erstellt die Datenpunkte und Alias für den Abfallkalender im Sonoff NSPanel
 * Es wird der iCal Adapter benötigt und eine URL mit Terminen vom Entsorger bzw. eine .ics-Datei mit den Terminen.
 * Das Script triggert auf dem bereitgestellten JSON im iCal adapter und füllt die 0_userdata.0 Datenpunkte
 * Weitere Informationen findest du in der FAQ auf Github https://github.com/joBr99/nspanel-lovelace-ui/wiki
*/


const idAbfalliCal: string = 'ical.0'; // iCal Instanz zum Abfallkalender
const idUserdataAbfallVerzeichnis: string = '0_userdata.0.Abfallkalender'; // Name des Datenpunktverzeichnis unter 0_userdata.0 -> Strandard = 0_userdata.0.Abfallkalender
const idAliasPanelVerzeichnis: string = 'alias.0.NSPanel'; //Name PanelVerzeichnis unter alias.0. Standard = alias.0.NSPanel.1
const idAliasAbfallVerzeichnis: string = 'Abfall'; //Name Verzeichnis unterhalb der idPanelverzeichnis  Standard = Abfall

const idZeichenLoeschen: number = 14; // x Zeichen links vom String abziehen, wenn vor dem Eventname noch Text steht z.B. Strassenname; Standard = 0
const idRestmuellName: string = 'Hausmüll'; // Schwarze Tonne
const idWertstoffName: string = 'Gelber Sack'; // Gelbe Tonne / Sack
const idPappePapierName: string = 'Papier';  // Blaue Tonne
const idBioabfaelleName: string = 'Biomüll'; // Braune Tonne

const Debug: boolean = false;

// ------------------------- Trigger zum füllen der 0_userdata Datenpunkte aus dem json vom ical Adapter -------------------------------

// Trigger auf iCal Instanz zur Json Tabelle
on({ id: idAbfalliCal + '.data.table', change: 'ne' }, async function () {

    try {

        let muell_JSON: any;
        let eventName: string;
        let farbNummer: number = 0;

        for (let i = 1; i <= 4; i++) {
            muell_JSON = getState(idAbfalliCal + '.data.table').val;
            setState(idUserdataAbfallVerzeichnis + '.' + String(i) + '.date', getAttr(muell_JSON, (String(i - 1) + '.date')));
            eventName = getAttr(muell_JSON, (String(i - 1) + '.event')).slice(idZeichenLoeschen, getAttr(muell_JSON, (String(i - 1) + '.event')).length);
            setState(idUserdataAbfallVerzeichnis + '.' + String(i) + '.event', eventName);

            if (Debug) console.log('%' + eventName + '%')

            if (eventName == idRestmuellName) {
                farbNummer = 33840;
            } else if (eventName == idBioabfaelleName) {
                farbNummer = 2016;
            } else if (eventName == idPappePapierName) {
                farbNummer = 31;
            } else if (eventName == idWertstoffName) {
                farbNummer = 65504;
            }
            setState(idUserdataAbfallVerzeichnis + '.' + String(i) + '.color', farbNummer);
        }
    } catch (err) {
        console.warn('error at subscrption: ' + err.message);
    }
});

// ------------------------------------- Ende Trigger ------------------------------------

// ------------------------------------- Funktionen zur Prüfung und Erstellung der Datenpunkte in 0_userdata.0 und alias.0 -----------------------

async function Init_Datenpunkte() {
    try {
        for (let i = 1; i <= 4; i++) {
            if (existsObject(idUserdataAbfallVerzeichnis + '.' + String(i)) == false) {
                console.log('Datenpunkt ' + idUserdataAbfallVerzeichnis + '.' + String(i) + ' werden angelegt')
                await createStateAsync(idUserdataAbfallVerzeichnis + '.' + String(i) + '.date', '', { type: 'string' });
                await createStateAsync(idUserdataAbfallVerzeichnis + '.' + String(i) + '.event', '', { type: 'string' });
                await createStateAsync(idUserdataAbfallVerzeichnis + '.' + String(i) + '.color', 0, { type: 'number' });
                setObject(idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis, { type: 'device', common: { name: { de: 'Abfall', en: 'Trash' } }, native: {} });
                setObject(idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + String(i), { type: 'channel', common: { role: 'warning', name: { de: 'Ereignis ' + String(i), en: 'Event' + String(i) } }, native: {} });
                await createAliasAsync(idAliasPanelVerzeichnis + '.' + idAliasAbfallVerzeichnis + '.event' + String(i) + '.TITLE', idUserdataAbfallVerzeichnis + '.' + String(i) + '.event', true, <iobJS.StateCommon>{ type: 'string', role: 'weather.title.short', name: { de: 'TITEL', en: 'TITLE' } });
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
