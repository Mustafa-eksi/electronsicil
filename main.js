const electron = require("electron");
const url = require("url");
const path = require("path");
const { protocol } = require("electron");
const sql = require("sqlite3").verbose();
const {app, BrowserWindow, ipcMain} = electron;
const db = new sql.Database("./data.db", sql.OPEN_READWRITE, (err) => {
    if(err) return console.error(err.message);
});
let mainWindow;
app.on('ready', () => {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration:true,
            contextIsolation:false,
            enableRemoteModule:true
        }
    });
    mainWindow.loadURL(
        url.format({
            pathname:path.join(__dirname, "index.html"),
            protocol:"file:",
            slashes:true
    }));
    /* Gerekli özellikler ve buna uygun yazılım tasarımı:
        1. Kişilerin isim-soyisim'li listesi
        2. Belli bir metine göre arayarak isim-soyisim listesi handle->search
        NOT: 1 ve 2'de isim soyisim yanında sicilno ve rol gönderildiğinden bir daha gönderilmesine gerek yoktur.
        4. Sicilno'su bilinen kişinin rolünü değiştirme key:updaterole
    */
    // Uygulama ilk başlatıldığında tüm kullanıcıları göndersin.
    db.all("select isim_soyisim, rol, sicilno from users", [], (err, rows)=>{
        mainWindow.webContents.send('key:sendoutput', rows);
    })
    // Belirli bir metinle sorgulanan isim-soyisimler
    ipcMain.handle('search', async (event, data)=>{ // data -> sorguda kullanılacak metin
        if(data === null || data == "") return new Error("Given data is null.");
        return new Promise((reslove, reject) => { // Promise kullanılmasının nedeni db.all'ın eşzamansız olmasıdır. Böylece frontend'de .then kullanarak verinin gelmesini bekleyebiliyoruz.
            db.all("select isim_soyisim, rol, sicilno from users where isim_soyisim like '"+data+"%'", [], (err, rows)=>{
                if(err) reject(err);
                if(rows == null) reject(new Error("Can't find"));
                reslove(rows)
            })
        });
    })
    // Rol değiştirme
    ipcMain.on('key:updaterole', (err, data) => { // data = {sicilno:"değiştirilmek istenilenin sicilnosu", yenirol:"kişinin yeni rolü"}
        if(data.sicilno == undefined || data.yenirol == undefined) return console.error("Sicilno or yenirol is undefined!");
        let yil = d.getFullYear().toString();
        let rol;
        switch(data.yenirol) {
            case "Yazılımcı":{ rol = 'Yz'; break;}
            case "Yardımcı":{ rol = 'Yr'; break;}
            case "Boş işler müdürü":{rol = 'Bo'; break;}
            default: rol = 'Belirsiz';
        }
        db.all("SELECT count(*) FROM users where rol='"+data.yenirol+"'", [], (err, rows1)=> {
            let rolsayi = rows1[0]['count(*)']+1;
            db.all("SELECT count(*) FROM users", [], (err, rows2)=>{
                let mevcutsayi= rows2[0]['count(*)']+1
                let yeni_sicilno = yil.charAt(3) + rol + rolsayi + 'T' + mevcutsayi;
                db.run("update users set rol='"+data.yenirol+"', sicilno='"+yeni_sicilno+"', sicilno_rev='"+data.sicilno+"', rev_ts="+Date.now()+" where sicilno="+data.sicilno, [], (err) => console.error(err.message));
            })
        })
    });
})