const semver = require('semver');
const {exec} = require('child_process');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})

const tag = process.env["npm_package_config_imagetag"];

const getusertag = ()=>{
    return new Promise((resolve)=>{
        readline.question(`please provide the next tag: `, (ctag)=>{
            const newtag = semver.valid(ctag) ? ctag : "";
            console.log(`once you have uploaded you can redeploy the new image with: kubectl set image deployment/buttonkit-[sitename] worker=tlodge/worker-latest:${newtag}`)
            exec(`npm config set worker-latest:imagetag=${newtag}`);
            readline.close();
            resolve();
        });
    });
}

if (semver.valid(tag)){
    console.log("latest tag is", tag);
    const newtag = semver.inc(tag, "minor");

    readline.question(`OK to upload with version ${newtag} (choose 't' to provide your own tag) [y/N/t] `, (yORn) => {
         if (yORn.trim().toLowerCase() === "y"){
             console.log(`once uploaded you can redeploy the new image with: kubectl set image deployment/buttonkit-[sitename] worker=tlodge/worker-latest:${newtag}`)
             exec(`npm config set worker-latest:imagetag=${newtag}`);
             readline.close()
         }
         else if (yORn.trim().toLowerCase() === "t"){
           getusertag().then(()=>{
                readline.close()
           });
         } 
         else {
            console.log("bye");
            readline.close()
         }
        
    })
}else{
    getusertag().then(()=>{
        readline.close();
    });
}

