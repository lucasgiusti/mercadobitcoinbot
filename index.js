//index.js
const http = require('http');
const urlApi = 'localhost';

require("dotenv-safe").load()
const MercadoBitcoin = require("./api").MercadoBitcoin
const MercadoBitcoinTrade = require("./api").MercadoBitcoinTrade
var infoApi = new MercadoBitcoin({ currency: 'BTC' })
var tradeApi = new MercadoBitcoinTrade({ 
    currency: 'BTC', 
    key: process.env.KEY, 
    secret: process.env.SECRET, 
    pin: process.env.PIN 
})

function getValueBuy(){
    var options = {
        host: urlApi,
        port: 3000,
        path: '/products',
        method: 'GET'
      };
      
      http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          verifyNegociation(JSON.parse(chunk)[0].price);
        });
      }).end();
}

function getQuantity(coin, price, isBuy, callback){
    price = parseFloat(price)
    coin = isBuy ? 'brl' : coin.toLowerCase()

    tradeApi.getAccountInfo((response_data) => {
        var balance = parseFloat(response_data.balance[coin].available).toFixed(5)
		balance = parseFloat(balance)
        if(isBuy && balance < 60) return console.log('Sem saldo disponível para comprar!')
        console.log(`Saldo disponível de ${coin}: ${balance}`)
        
        if(isBuy) balance = parseFloat((balance / price).toFixed(5))
        console.log('quantity buy: ' + parseFloat(parseFloat(balance) - 0.00001).toFixed(5))
        callback(parseFloat(parseFloat(balance) - 0.00001).toFixed(5))//tira a diferença que se ganha no arredondamento
    }, 
    (data) => console.log(data))
}

function verifyNegociation(price){
    price = parseFloat(price)
    infoApi.ticker((tick) => {
        console.log(tick);
        if(tick.ticker.sell <= price){
            getQuantity('BRL', tick.ticker.sell, true, (qty) => {
                 tradeApi.placeBuyOrder(qty, tick.ticker.sell, 
                     (data) => {
                         console.log('Ordem de compra inserida no livro. ' + JSON.stringify(data))
                         //operando em STOP
                         setTimeout(() =>                          
                         tradeApi.placeSellOrder(
                            arredondar(parseFloat(parseFloat(data.order.quantity)-parseFloat(parseFloat(data.order.quantity)*0.007)),5,1), 
                            parseFloat(tick.ticker.sell * parseFloat(process.env.PROFITABILITY)).toFixed(5),
                             
                             (data) => console.log('Ordem de venda inserida no livro. ' + JSON.stringify(data)),
                             (data) => console.log('Erro ao inserir ordem de venda no livro. ' + data))
                             ,
                             process.env.CRAWLER_INTERVAL / 2
                          )

                     },
                     (data) => console.log('Erro ao inserir ordem de compra no livro. ' + data))
            })
        }
        else
             console.log('Ainda muito alto, vamos esperar pra comprar depois.')
    })
}

function arredondar(valor, casas, ceilOrFloor) 
{
    var arredondado = valor;
    arredondado *= (Math.pow(10, casas));
    if (ceilOrFloor == 0) {
        arredondado = Math.ceil(arredondado);           
    } else {
        arredondado = Math.floor(arredondado);
    }
    arredondado /= (Math.pow(10, casas));
    return arredondado;
}


setInterval(() => 
    //tradeApi.placeSellOrder(arredondar(parseFloat(parseFloat('0.00339000')-parseFloat(parseFloat('0.00339000')*0.007)),5,1), parseFloat('61654.99999').toFixed(5), 
    //                         (data) => console.log('Ordem de venda inserida no livro. ' + JSON.stringify(data)),
    //                         (data) => console.log('Erro ao inserir ordem de venda no livro. ' + data))
    getValueBuy()   
    ,
   process.env.CRAWLER_INTERVAL
)
