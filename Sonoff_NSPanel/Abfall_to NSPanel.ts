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
 * Version 5.0.1
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

    JSON_auswerten();

});

// ------------------------------------- Ende Trigger ------------------------------------

// ------------------------------------- Funktion JSON auswerten und DP füllen -------------------------------
async function JSON_auswerten() {
    try {

        let muell_JSON: any;
        let eventName: string;
        let eventDatum: string;
        let eventStartdatum: string;
        let farbNummer: number = 0;
        let abfallNummer: number = 1;

        muell_JSON = getState(idAbfalliCal + '.data.table').val;
        if (Debug) console.log('Rohdaten von iCal: ' + JSON.stringify(muell_JSON))


        if (Debug) { console.log('Anzahl iCal - Daten: ' + muell_JSON.length) };

        for (let i = 0; i < muell_JSON.length; i++) {
            if (abfallNummer === 5) {
                if (Debug) console.log('Alle Abfall-Datenpunkte gefüllt');
                break;
            }

            eventName = getAttr(muell_JSON, (String(i) + '.event')).slice(idZeichenLoeschen, getAttr(muell_JSON, (String(i) + '.event')).length);
            // Leerzeichen vorne und hinten löschen
            eventName = eventName.trimEnd();
            eventName = eventName.trimStart();

            eventDatum = getAttr(muell_JSON, (String(i) + '.date'));
            eventStartdatum = getAttr(muell_JSON, (String(i) + '._date'));
            
            let d: Date = currentDate();
            let d1: Date = new Date(eventStartdatum);

            if (Debug) console.log('--------- Nächster Termin wird geprüft ---------');
            //if (Debug) console.log(d + ' ' + d1);
            if (Debug) console.log('Startdatum UTC: ' + eventStartdatum);
            if (Debug) console.log('Datum: ' + eventDatum);
            if (Debug) console.log('Event: ' + eventName);
            if (Debug) console.log('Kontrolle Leerzeichen %' + eventName + '%');

            if (d.getTime() <= d1.getTime()) {
                if ((eventName == idRestmuellName) || (eventName == idWertstoffName) || (eventName == idBioabfaelleName) || (eventName == idPappePapierName)) {

                    setState(idUserdataAbfallVerzeichnis + '.' + String(abfallNummer) + '.date', eventDatum);
                    setState(idUserdataAbfallVerzeichnis + '.' + String(abfallNummer) + '.event', eventName);

                    if (eventName == idRestmuellName) {
                        farbNummer = 33840;
                    } else if (eventName == idBioabfaelleName) {
                        farbNummer = 2016;
                    } else if (eventName == idPappePapierName) {
                        farbNummer = 31;
                    } else if (eventName == idWertstoffName) {
                        farbNummer = 65504;
                    }
                    setState(idUserdataAbfallVerzeichnis + '.' + String(abfallNummer) + '.color', farbNummer);

                    if (Debug) console.log('Abfallnummer: ' + abfallNummer);

                    abfallNummer += 1
                } else {
                    if (Debug) console.log('Kein Abfalltermin => Event passt mit keinem Abfallnamen überein.');
                }
            }else{
                if (Debug) console.log('Termin liegt vor dem heutigen Tag');
            }
        }
    } catch (err) {
        console.warn('error at subscrption: ' + err.message);
    }
};

// ------------------------------------- Ende Funktion JSON ------------------------------

function currentDate() {
    let d: Date = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

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
        console.log('Startabfrage der Daten aus dem iCal Adapter');
        JSON_auswerten();
    } catch (err) {
        console.warn('error at function Init_Datenpunkte: ' + err.message);
    }
}
Init_Datenpunkte();

// --------------------------- Ende Funktionen Datenpunkte ------------------------------------------------