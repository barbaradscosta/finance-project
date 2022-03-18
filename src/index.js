const express = require('express')
const { v4: uuidv4 } = require("uuid")
const app = express()
app.use(express.json())
const customers = [] //array para armazenar os dados dos clientes

//*************************MIDDLEWARE****************************
function verifyIfExistsAccountCPF(request, response, next) {
    const { cpf } = request.headers
    //procura pelo cpf existente:
    const customer = customers.find((customer) => customer.cpf === cpf) //find: procura o cpf informado
    //verifica se o cliente existe:
    if (!customer) {
        return response.status(400).json({ error: "customer not found!" })
    }
    request.customer = customer
    return next()
}

//******************** FUNÇÃO DE FAZER BALANÇO DA CONTA ******************** 
function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => { //função REDUCE busca reduzir um array, pega todos os valores atribuidos e no final vai gerar um unico valor 
        if (operation.type === 'credit') {
            return acc + operation.amount
        } else {
            return acc - operation.amount
        }
    },
        0) // valor inicial do reduce = 0
    return balance
}

//----------------------CRIAR CONTA DO CLIENTE-------------------------
app.post("/account", (request, response) => {
    const { cpf, name } = request.body

    //verifica se o cpf já existe
    const alreadyExists = customers.some((customer) => customer.cpf === cpf) //some: existe ou nao existe
    if (alreadyExists) {
        return response.status(400).json({ error: "customer already exists!" })
    }  //verifica se o cpf já existe

    customers.push({   //função push serve para inserir dados dentro do array
        cpf,
        name,
        id: uuidv4(),
        statement: []
    })
    return response.status(201).send()
})

//----------------------BUSCAR EXTRATO BANCÁRIO DO CLIENTE-------------------------
//app.use(verifyIfExistsAccountCPF)
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => { //pega o cpf do cliente pelo route params  {USANDO MIDDLEWARE}
    const { customer } = request
    return response.json(customer.statement)
})

//---------------------------INSERINDO DEPÓSITO----------------------------
app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => { //utiliza o middleware para verificar se existe o cpf
    const { description, amount } = request.body
    const { customer } = request //verifica se a conta é válida ou nao

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation) //inserindo os dados dentro do statement
    return response.status(201).send()
})

// ----------------------------------SAQUE---------------------------------
app.post("/draft", verifyIfExistsAccountCPF, (request, response) => {
    const { amount } = request.body //recebe a quantia do saque
    const { customer } = request //pega as informações de quanto o cliente tem em conta

    const balance = getBalance(customer.statement)

    if (balance < amount) {
        return response.status(400).json({ error: "saldo insuficiente" })
    }
    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }
    customer.statement.push(statementOperation)
    return response.status(201).send()
})

// -----------------------------ALTERAR CONTA---------------------------------
app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { name } = request.body
    const { customer } = request

    customer.name = name
    return response.status(201).send()
})
app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request
    return response.json(customer)
})

//--------------------------------DELETAR A CONTA------------------------------
app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request
    customers.splice(customer, 1) //função splice, primeiro parametro mostra onde inicia a remoção, segundo parametro é até onde espera que faça a remoção
    return response.status(200).json(customers)
})

// ------------------------------BALANÇO DA CONTA-------------------------------
app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request
    const balance = getBalance(customer.statement)

    return response.json(balance)
})
app.listen(3333)