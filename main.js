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
        1. Kişilerin isim-soyisim'li listesi key:allusers
        2. Kişi listesinin frontend tarafından istenmesi get-users
        NOT: 1 ve 2'de isim soyisim yanında sicilno ve rol gönderildiğinden bir daha gönderilmesine gerek yoktur.
        3. Sicilno'su bilinen kişinin rolünü değiştirme key:updaterole
    */
   let kisiler; // Güncellerken en sonki toplam sayıyı bulmak için
    // 1 - Uygulama ilk başlatıldığında tüm kullanıcıları göndersin.
    db.all("select tcno, isim_soyisim, rol, sicilno from users", [], (err, rows)=>{
        if(err) return console.error(err.message);
        kisiler = rows;
        mainWindow.webContents.send('key:allusers', rows);
    })
    // 2 - Kullanıcıları getirme
    ipcMain.handle('get-users', async (e) => {
        return new Promise((reslove, reject)=> {
            db.all("select tcno, isim_soyisim, rol, sicilno from users", [], (err, rows)=>{
                if(err) reject(err);
                kisiler = rows;
                reslove(rows)
            })
        })
    })
    // 3 - Rol değiştirme
    // Bunu handle'la yapmamın amacı işlem bittiğinde (frontend'de güncelleyebilmek için) yeni sicilnoyu göndermektir.
    ipcMain.handle('updaterole', async (e, data)=> { // data = {sicilno:"değiştirilmek istenilenin sicilnosu", yenirol:"kişinin yeni rolü"}
        if(data.sicilno == undefined || data.yenirol == undefined) return console.error("Sicilno or yenirol is undefined!");
        const d = new Date();
        let yil = d.getFullYear().toString();
        let rol;
        switch(data.yenirol) {
            case "Yazılımcı":{ rol = 'Yz'; break;}
            case "Yardımcı":{ rol = 'Yr'; break;}
            case "Boş işler müdürü":{rol = 'Bo'; break;}
            default: rol = 'Belirsiz';
        }
        return new Promise((resolve, reject)=> {
            db.all("SELECT sicilno FROM users where rol='"+data.yenirol+"'", [], (err, rows1)=> {
                let rolsayi = 0;
                rows1.forEach((e)=>{
                    let erol = e["sicilno"].split(rol)[1].split('T')[0];
                    if(parseInt(erol) >= rolsayi) {
                        rolsayi = parseInt(erol)+1;
                    }
                });
                let yeni_sicilno = yil.charAt(3) + rol + rolsayi + 'T' + data.sicilno.split('T')[1];
                //console.log("update users set rol='"+data.yenirol+"', sicilno='"+yeni_sicilno+"', sicilno_rev='"+data.sicilno+"', rev_ts="+Date.now()+" where sicilno="+data.sicilno);
                db.run("update users set rol='"+data.yenirol+"', sicilno='"+yeni_sicilno+"', sicilno_rev='"+data.sicilno+"', rev_ts="+Date.now()+" where sicilno='"+data.sicilno+"'", [], (err) => {if(err) reject(err.message)});
                resolve(yeni_sicilno);
            })
        });
    });
    /*ipcMain.on('key:updaterole', (err, data) => { // data = {sicilno:"değiştirilmek istenilenin sicilnosu", yenirol:"kişinin yeni rolü"}
        if(data.sicilno == undefined || data.yenirol == undefined) return console.error("Sicilno or yenirol is undefined!");
        const d = new Date();
        let yil = d.getFullYear().toString();
        let rol;
        switch(data.yenirol) {
            case "Yazılımcı":{ rol = 'Yz'; break;}
            case "Yardımcı":{ rol = 'Yr'; break;}
            case "Boş işler müdürü":{rol = 'Bo'; break;}
            default: rol = 'Belirsiz';
        }
        db.all("SELECT sicilno FROM users where rol='"+data.yenirol+"'", [], (err, rows1)=> {
            let rolsayi = 0;
            rows1.forEach((e)=>{
                let erol = e["sicilno"].split(rol)[1].split('T')[0];
                if(parseInt(erol) >= rolsayi) {
                    rolsayi = parseInt(erol)+1;
                }
            });
            let yeni_sicilno = yil.charAt(3) + rol + rolsayi + 'T' + data.sicilno.split('T')[1];
            //console.log("update users set rol='"+data.yenirol+"', sicilno='"+yeni_sicilno+"', sicilno_rev='"+data.sicilno+"', rev_ts="+Date.now()+" where sicilno="+data.sicilno);
            db.run("update users set rol='"+data.yenirol+"', sicilno='"+yeni_sicilno+"', sicilno_rev='"+data.sicilno+"', rev_ts="+Date.now()+" where sicilno='"+data.sicilno+"'", [], (err) => {if(err) return console.error(err.message)});
        })
    });*/
})