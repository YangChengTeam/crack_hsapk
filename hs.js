//cnpm i md5 request cheerio

const fs = require("fs");
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const md5 = require("md5");

const request = require("request")

const cheerio = require("cheerio");


var default_params = {
    userua: "Mozilla/5.0 (Linux; Android 4.4.2; HUAWEI MLA-AL10 Build/HUAWEIMLA-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Mobile Safari/537.36",
    package: "com.pieceapp.chatskills",
    appid: "fiev73r9gk",
    params: '{}',
    from: "3",
    agentname: "default",
    mac_address:"08:00:27:9d:d6:7c",
    timestamp: "1555320086",
    token: "599b1b40b81c634552a90ce126688c0819224abbeb74b007695b81ef52603195",
    device: "HUAWEI MLA-AL10",
    uuid: "00000000-3db8-68ca-ffff-ffffc287e4e81",
    verid: "12",
    system_version :"Android 4.4.2"
}

// url sign
function md5Params(params)
{   
    params.timestamp = new Date().getTime();
    var query = "";
    Object.keys(params).sort().forEach((key, i)=>{
        query += key + "=" + params[key] + "&";
    });
    query += "key=56lj6e24xwv6w2hjlr3q"; 
    query += "&sign=" + md5(query).toUpperCase();
    return query;
}

// data decode
async function decode(data) {
    const { stdout, stderr } = await exec(`java -jar decode.jar ${data}`);
    return stdout;
}

function common(path, params){
    if(params){
        default_params.params = encodeURIComponent(params);
    }
    default_params.timestamp = new Date().getTime();
    var url= base_url + path + md5Params(default_params);
    console.log(url);
    var promise = new Promise((r, j)=>{
        request.get(url, (e,resp)=>{
            if(e){
               j();
            }{
              try{   
                console.log(resp.body)
                r(JSON.parse(resp.body));
              }catch(e){
                console.log(e);
                j();
              }finally{
               
              }
            }
        });
    });
    promise.catch(new Function);
    return promise;
}


var base_url = "https://apic.btspreat.com/index.php/v3/new/";


function duihua_category(){
    return common("duihua/category?");
}

function duihua_list(page, id){
    return common("duihua/list?", `{"page": "${page}", "cid": "${id}"}`);
}

function qinghua(page){
    return common("qinghua/list?", `{"page": "${page}"}`);
}

function school(page){
    return common("school/shizhan?", `{"page": "${page}"}`);
}

function school_articleCategory(recommended, page){
    return common("school/articleCategory?", `{"page": "${page}"}`);
}

function school_topArticleNews(recommended, page){
    return common("school/articleNews?",  `{"recommended":"${recommended}", "page":"${page}"}`);
}


function school_articleNews(page, cid){
    return common("school/articleNews?",  `{"cid":"${cid}", "page":"${page}"}`);
}

function school_listNews(page, cid){
    return common("school/list?",  `{"cid":"${cid}", "page":"${page}"}`);
}

function video(page, is_index, is_wallpaper, cid){
    var params = `{"img_size":"400", "is_index":"${is_index}", "page": "${page}"}`;
    if(is_wallpaper){
        params = `{"img_size":"400", "is_wallpaper": "${is_wallpaper}", "page": "${page}"}`;
    } else if(cid){
        params = `{"img_size":"400", "is_index": "2", "cid": "${cid}", "page": "${page}"}`;
    }
    return common("video/list?",  `{"img_size":"400", "is_index": "${is_index}", "page": "${page}"}`);
}

function topicList(page){
    return common("video/topicList?",  `{"page": "${page}"}`);
}

function video_msg(vid){
    return common("video/view?",  `{"vid": "${vid}"}`);
}

function emoji(page){
    return common("emoji/bagList?",  `{"page": "${page}"}`);
}


function emoji_list(bag_id){
    return common("emoji/list?",  `{"row":200, "bag_id": "${bag_id}"}`);
}

function search(type, page, keyword){
    return common("search/search?",  `{"search_type":"${type}", "page": "${page}", "keyword": "${keyword}"}`);
}

// 写入数据到指定路径
function w(path, data){
    if(!fs.existsSync(path)){
        fs.writeFileSync(path, data); 
    }
}

// 下载图片到指定路径
function d(path, image){
    var promise = new Promise((r, j)=>{
        request
        .get(image)
        .on('error', function(err) {
            j(err);
        })
        .on('end', function(){
            r();
        })
        .pipe(fs.createWriteStream(path))
    });
    promise.catch(new Function);
    return promise;
}

// page loop 
async function page_loop(fun_list, type , obj={id:""}){
    var page = 1;
    for(;;){
        var list_data = await fun_list(page, obj.id);
        console.log(obj.id);
        if(list_data.code == 200 && list_data.data && list_data.data.length > 0){
            w("hs/list_data_"+ type + (obj.id ? "_" + obj.id : "") + "_"+page+".json",JSON.stringify(list_data));
            if(obj.callbck){
                obj.callbck(list_data, type, page);
            }
        } else {
            console.log("共" + (page--) + "页");
            break;
        }
        if(page >=100 ){
            break;
        }
        page++;
    }
}

// 对话
async function main1(){
    var category_data = await duihua_category(); 
    if(category_data && category_data.code == 200 &&  category_data.data){
        w("hs/category_data.json",JSON.stringify(category_data.data));
        for(var j=0; j < category_data.data.length ; j++ ){
            var v =  category_data.data[j];
            for(var i = 0; i < v.children.length ; i++){
                var v2 =  v.children[i]; 
                await page_loop(duihua_list, "duihua",  {id: v2.id}); 
            }
        }
    }
}


// 学堂
async function main2(){
    await page_loop(school, "school", {"id": "", callbck: async (school_data)=>{
        for(var i = 0; i < school_data.data.length; i++){
            var data = school_data.data[i];
            const $ = cheerio.load(data.post_content);
            var url = $("img").prop("src");
            var path = 'hs/image/' + md5(url) + ".jpg";
            
            if(!fs.existsSync(path) && url.indexOf("http") != -1){
                await d(path, url).catch((err)=>{
                        console.log(url);
                });
            }
        }
    }});
}

async function main22(){
    for(i=1; i < 40; i++){
        await page_loop(school_listNews, "schoolList", {id: i});
    }
}

async function main23(){
    for(i=1; i < 40; i++){
        await page_loop(school_articleNews, "school_articleNews", {id: i});
    }

    
}

// 情话
async function main3(){
    await page_loop(qinghua, "qinghua");
}


// 视频
async function main4(){
//     var page = 1;
//     for(;;){
//         var list_data = await video(page, "2");
//         if(list_data.code == 200 && list_data.data && list_data.data.length > 0){
//             w("hs/list_data_video_is_index2_"+page+".json", await decode(list_data.data));
//         } else {
//             console.log("共" + page + "页");
//             break;
//         }
//         if(page >=100 ){
//             break;
//         }
//         page++;
//    }

//    page = 1;
//    for(;;){
//         var list_data = await video(page, "", "1");
//         if(list_data.code == 200 && list_data.data && list_data.data.length > 0){
//             w("hs/list_data_video_is_wallpaper1_"+page+".json", await decode(list_data.data));
//         } else {
//             console.log("共" + page + "页");
//             break;
//         }
//         if(page >=100 ){
//             break;
//         }
//         page++;
//    }

//    page = 1;
//    for(;;){
//         var list_data = await video(page, "", "2");
//         if(list_data.code == 200 && list_data.data && list_data.data.length > 0){
//             w("hs/list_data_video_is_wallpaper2_"+page+".json", await decode(list_data.data));
//         } else {
//             console.log("共" + page + "页");
//             break;
//         }
//         if(page >=100 ){
//             break;
//         }
//         page++;
//    }

//    await page_loop(topicList, "topic_list");
   
}

async function main5(){
   var keywords = `耀 躁 嚼 嚷 籍 魔 灌 蠢 霸 露 囊 罐`
   var keywords =  keywords.split(" ")
   for(var i = 0; i < keywords.length ; i++){
        keyword = keywords[i].trim().replace("\r","").replace("\n","");
        if(keyword.length == 0){
            continue;
        }
        console.log(keyword);
        var page = 1;
        for(;;){
            var list_data = await search(0, page, keyword);
            if(list_data.code == 200 && list_data.data && list_data.data.length > 0){
                w("hs/list_data_search_"+page+"_"+keyword+".json", JSON.stringify(list_data));
            } else {
                console.log("搜索"+keyword + "共" + (page-1) + "页");
                break;
            } 
            page++;
        }
   }
}

function main(){
    // main1();
    // main2();
    // main3();
    // main4()
    // main5();

    main23();
}

module.exports = {
    school_topArticleNews
}