import com.bleedingwolf.ratpack.Ratpack
import com.bleedingwolf.ratpack.RatpackServlet
import org.json.JSONObject
import org.json.JSONArray
import com.cadrlife.jhaml.JHaml
import static groovyx.net.http.ContentType.JSON
import groovyx.net.http.RESTClient
import groovy.text.GStringTemplateEngine
import org.apache.commons.lang.StringEscapeUtils

def environment = args[0]

def config = new ConfigSlurper(environment).parse(new File('config.groovy').toURL())

def couch(config) {
    def couch = new RESTClient("http://${config.couch.host}:${config.couch.port}/")
    couch.auth.basic config.couch.username, config.couch.password
    couch
}
def db = config.couch.db

def haml(String fileName) {
    haml(fileName, [:])
}

def haml(String fileName, binding) {
    def bindingCopy = [:]
    bindingCopy.html = [escape:{o ->
        StringEscapeUtils.escapeHtml(o.toString())
    }]
    bindingCopy.json = [
        toJson:{o ->
            new JSONObject(o).toString()
        },
        toJsonArray:{o ->            
            new JSONArray(o).toString()
        }
    ]
    bindingCopy.putAll(binding)
    def gsp = new JHaml().parse(new File(fileName).text)
    def engine = new GStringTemplateEngine()
    def template = engine.createTemplate(new StringReader(gsp)).make(bindingCopy)
    template.toString()
}

def baselineGroupTissues(couch,db) {
    def response = couch.get(
        path: "/${db}/_design/slidetracker/_view/baseline_groups",
        contentType: JSON)
    def tissues = []
    response.data.rows.each {tissues += it.value.tissues}
    tissues
}

def allGroups(couch,db) { 
    def response = couch.get(
        path: "/${db}/_design/slidetracker/_view/all_groups",
        contentType: JSON)
    def groups = response.data.rows.collect {it.value}
    groups
}

def allPigs(couch,db) { 
    def response = couch.get(
        path: "/${db}/_design/slidetracker/_view/all_pigs",
        contentType: JSON)
    def pigs = response.data.rows.collect {it.value}
    pigs
}

def allPigsByGroup(couch,db,validGroupIds) { 
    def response = couch.get(
        path: "/${db}/_design/slidetracker/_view/all_pigs",
        contentType: JSON)
    def pigsByGroup = [:]
    validGroupIds.each {groupId -> pigsByGroup.put(groupId,[])}
    pigsByGroup.put("",[])
    def pigs = response.data.rows.each {row ->
        if (validGroupIds.contains(row.value.groupId)) { 
            pigsByGroup.get(row.value.groupId) << row.value
        } else {
            pigsByGroup.get("") << row.value
        }
    }
    pigsByGroup
}

def sortBySacDate(pigs) { 
    pigs.sort {pig -> 
        try {
            parseDate(pig.sacDate).time
        } catch (e) {
            new Date().time
        }
    }
}

def allSets(couch,db) { 
    def response = couch.get(
        path: "/${db}/_design/slidetracker/_view/all_sets",
        contentType: JSON)
    def groups = response.data.rows.collect {it.value}
    groups
}

def loadDoc(couch,db,id) { 
    def response = couch.get(path: "/${db}/${id}",contentType: JSON)
    response.data
}

def storeDoc(couch,db,id,body) { 
    couch.put(
        path: "${db}/${id}", 
        requestContentType: JSON, 
        contentType: JSON,
        body: body)
}

def dateFormat = "MM/DD/yyyy"

def todayString() { 
    new Date().format("MM/dd/yyyy")
}

def parseDate(date) {
    Date.parse("MM/dd/yyyy", date) 
}

def createId() { 
    new Date().time
}

def models = [
    set:[
        fields:["requester","stain","requestDate","tissue","tissues","pigIds","pigsByGroup","comment"]
    ]
]

def app = Ratpack.app {
    set 'templateRoot', "."
    set 'public', "public"

    get("/file") {
        new File("views/file.html").text
    }
    
    get("/") {
        setHeader('Content-Type', 'text/html')
        haml "views/index.haml"
    }

    get("/_new_group") {
        def tissues = baselineGroupTissues(couch(config),db)
        def binding = [group: [name:"", tissues:tissues, comment:""], isNew:true]
        setHeader('Content-Type', 'text/html')
        haml "views/_edit_group.haml", binding
    }

    get("/_groups") {
        def groups = allGroups(couch(config),db)
        def pigsByGroup = allPigsByGroup(couch(config),db,groups*._id)
        groups.each { group ->
            def pigs = pigsByGroup.get(group._id) ?: []
            group.pigs = sortBySacDate(pigs)
        }
        def ungroupedPigs = pigsByGroup.get("")
        setHeader('Content-Type', 'text/html')
        haml "views/_groups.haml", [groups: groups, ungroupedPigs:ungroupedPigs]
    }

    get("/_edit_group") {
        def id = params.id
        setHeader('Content-Type', 'text/html')
        haml "views/_edit_group.haml", [group:loadDoc(couch(config),db,id), isNew:false]
    }

    get("/_edit_pig") {
        def groups = allGroups(couch(config),db)
        def id = params.id
        setHeader('Content-Type', 'text/html')
        haml "views/_edit_pig.haml", [pig:loadDoc(couch(config),db,id), isNew:false, groups:groups]
    }

    get("/_sacrifice") {
        def sacDate = todayString()
        def groups = allGroups(couch(config),db)
        def pig = [sacDate:sacDate, 
                   pigNumber:"", 
                   tissues:[], 
                   groupId:"", 
                   comment:""]
        def binding = [pig: pig, isNew:true, groups:groups]
        setHeader('Content-Type', 'text/html')
        haml "views/_edit_pig.haml", binding
    }

    get("/_tissue_select") {
        def group = loadDoc(couch(config),db,params.groupId)
        setHeader('Content-Type', 'text/html')
        haml "views/_ _select.haml", [group: group]
    }

    get("/_request_sets") {
        def groups = allGroups(couch(config),db)
        def pigsByGroup = allPigsByGroup(couch(config),db,groups*._id)
        groups.each { group ->
            def pigs = pigsByGroup.get(group._id) ?: []
            group.pigs = sortBySacDate(pigs)
        }
        def ungroupedPigs = pigsByGroup.get("")
        def binding = [requestDate:todayString()]
        binding.pigGroups = groups.findAll { !it.pigs.isEmpty() }
        if (!ungroupedPigs.isEmpty()) {
            binding.pigGroups << [name: "[Ungrouped]", _id:"", pigs: ungroupedPigs]
        }
        setHeader('Content-Type', 'text/html')
        haml "views/_request_sets.haml", binding
    }

    get("/_pending_sets") {
        def sets = allSets(couch(config),db)
        def groups = allGroups(couch(config),db)
        def groupNamesById = [:]
        groups.each {groupNamesById[it._id] = it.name}
        def pigs = allPigs(couch(config),db)
        def pigsById = [:]
        pigs.each {pigsById[it._id] = it}
        sets.each {set->
            def groupIds = set.pigsByGroup?.keySet() ?: []
            set.groupNames = groupIds.collect {groupId->
                groupNamesById[groupId]
            }
            set.pigs = set.pigIds.collect {pigId->
                pigsById[pigId]
            }
            if (set.tissue && !set.tissues) {
                set.tissues = [set.tissue]
            }
            
        }
        setHeader('Content-Type', 'text/html')
        haml "views/_pending_sets.haml", [pendingSets: sets]
    }



    get("/api/save_group") {
        def id = params.id ?: createId()
        def rev = params.rev
        def name = params.name
        def tissues = params.get("tissues")
        def body = [name: name, type: "group", tissues:tissues, comment:params.comment]
        if (rev) {
            body._id = id
            body._rev = rev
        }
        if (params.baseline) { 
            body.baseline = true
        }
        def response = storeDoc(couch(config),db,id,body)
        if (response.data.ok) {
            
        }
        ""
    }

    get("/api/save_pig") {
        def id = params.id ?: createId()
        def rev = params.rev
        def tissues = params.get("tissues")
        def body = [pigNumber:params.pigNumber,
                    sacDate:params.sacDate,
                    groupId:params.groupId,
                    type: "pig",
                    tissues:tissues,
                    comment:params.comment]
        if (rev) {
            body._id = id
            body._rev = rev
        }
        if (params.baseline) { 
            body.baseline = true
        }
        def response = storeDoc(couch(config),db,id,body)
        if (response.data.ok) {
            
        }
        ""
    }
    
    def saveAction = {
        def params = it.params
        def type = it.type
        def response = it.response
        def model = models[type]
        def id = params.id ?: createId()
        def rev = params.rev
        def body = [type:type]
        if (rev) {
            body._id = id
            body._rev = rev
        }
        model.fields.each { field ->
            if (null != params[field]) { 
                body[field] = params[field]
            } 
        }
        def couchDbResponse = storeDoc(couch(config),db,id,body)
        response.status = couchDbResponse.status
        couchDbResponse.data.toString()
    }

    post("/api/deliver_set") {
        def myCouch = couch(config)
        def set = loadDoc(myCouch,db,params["id"])
        set.deliveryDate = params["date"]
        def couchDbResponse = storeDoc(myCouch,db,set._id,set)
        response.status = couchDbResponse.status
        couchDbResponse.data.toString()
        
    }

    post("/api/save_set") {
         saveAction(type:"set",params:params,response:response)
     }


    get("/api/assignPigsByGoup/:id") {
    
        def doc = loadDoc(couch(config),db,urlparams.id)
        doc.id = doc._id
        doc.rev = doc._rev
        def pigsByGroup = [:]
        if (doc.type == 'set') {
            for (pigId in doc.pigIds) {
                def pig = loadDoc(couch(config),db,pigId)
                if (!pigsByGroup.containsKey(pig.groupId)) { 
                    pigsByGroup[pig.groupId] = []
                }
                pigsByGroup[pig.groupId] << pigId
            }
            doc.pigsByGroup = pigsByGroup
            saveAction(type:"set",params:doc,response:response)
        }
        
    }
    
    def deleteAction = {
        def id = params.id
        def rev = params.rev
        def response = couch(config).delete(
            path: "${db}/${id}",
            query: [rev:rev],
            contentType: JSON)
        if (response.data.ok) {
            
        }
        ""
    }

    get("/api/delete_group", deleteAction)
    get("/api/delete_pig", deleteAction)
    get("/api/delete_set", deleteAction)



}

RatpackServlet.serve(app, config.app.port)
