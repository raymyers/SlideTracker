import com.bleedingwolf.ratpack.Ratpack
import com.bleedingwolf.ratpack.RatpackServlet
import org.json.JSONObject
import com.cadrlife.jhaml.JHaml
import static groovyx.net.http.ContentType.JSON
import groovyx.net.http.RESTClient
import groovy.text.GStringTemplateEngine
import org.apache.commons.lang.StringEscapeUtils

def environment = args[0]

def config = new ConfigSlurper(environment).parse(new File('config.groovy').toURL())

def couch = new RESTClient("http://${config.couch.host}:${config.couch.port}/")
couch.auth.basic config.couch.username, config.couch.password

def db = config.couch.db

def haml(String fileName) {
    new JHaml().parse(new File(fileName).text)
}

def haml(String fileName, binding) {
    def bindingCopy = [:]
    bindingCopy.html = [escape:{o ->
        StringEscapeUtils.escapeHtml(o.toString())
    }]
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

def extractTissues(params) { 
    def tissues = []
    tissues << params.get("tissues[]")
    tissues
}

def allGroups(couch,db) { 
    def response = couch.get(
        path: "/${db}/_design/slidetracker/_view/all_groups",
        contentType: JSON)
    def groups = response.data.rows.collect {it.value}
    groups
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


def loadDoc(id,couch,db) { 
    def response = couch.get(path: "/${db}/${id}",contentType: JSON)
    response.data
}

def app = Ratpack.app {
    set 'templateRoot', "."
    set 'public', "public"

    get("/file") {
        new File("views/file.html").text
    }
    
    get("/") {
      haml "views/index.haml"
    }

    get("/_new_group") {
        def tissues = baselineGroupTissues(couch,db)
        def binding = [group: [name:"", tissues:tissues, comment:""], isNew:true]
        haml "views/_edit_group.haml", binding
    }

    get("/_groups") {
        def groups = allGroups(couch,db)
        def validGroupIds = groups*._id
        def pigsByGroup = allPigsByGroup(couch,db,validGroupIds)
        groups.each { group ->
            def pigs = pigsByGroup.get(group._id) ?: []
            group.pigs = pigs.sort {pig -> 
                try {
                    Date.parse("MM/dd/yyyy", pig.sacDate).time
                } catch (e) {
                    new Date().time
                }
            }
        }
        def ungroupedPigs = pigsByGroup.get("")
        haml "views/_groups.haml", [groups: groups, ungroupedPigs:ungroupedPigs]
    }

    get("/_edit_group") {
        def id = params.id
        haml "views/_edit_group.haml", [group: loadDoc(id,couch,db), isNew:false]
    }

    get("/api/save_group") {
        def id = params.id ?: new Date().time
        def rev = params.rev
        def name = params.name
        def tissues = params.get("tissues[]")
        def body = [name: name, type: "group", tissues:tissues, comment:params.comment]
        if (rev) {
            body._id = id
            body._rev = rev
        }
        if (params.baseline) { 
            body.baseline = true
        }
        def response = couch.put(
            path: "${db}/${id}", 
            requestContentType: JSON, 
            contentType: JSON,
            body: body)
        if (response.data.ok) {
            
        }
        ""
    }

    get("/api/delete_group") {
        def id = params.id
        def rev = params.rev
        def response = couch.delete(
            path: "${db}/${id}",
            query: [rev:rev],
            contentType: JSON)
        if (response.data.ok) {
            
        }
        ""
    }

    get("/_sacrifice") {
        def sacDate = new Date().format("MM/dd/yyyy")
        def groups = allGroups(couch,db)
        def pig = [sacDate:sacDate, 
                   pigNumber:"", 
                   tissues:[], 
                   groupId:"", 
                   comment:""]
        def binding = [pig: pig, isNew:true, groups:groups]
        haml "views/_sacrifice.haml", binding
    }

    get("/api/save_pig") {
        def id = params.id ?: new Date().time
        def rev = params.rev
        def sacDate = params.sacDate
        def tissues = params.get("tissues[]")
        def body = [
            pigNumber: params.pigNumber,
            sacDate: sacDate,
            groupId: params.groupId,
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
        def response = couch.put(
            path: "${db}/${id}", 
            requestContentType: JSON, 
            contentType: JSON,
            body: body)
        if (response.data.ok) {
            
        }
        ""
    }


    get("/_tissue_select") {
        def group = loadDoc(params.groupId,couch,db)
        haml "views/_tissue_select.haml", [group: group]
    }

}

RatpackServlet.serve(app, config.app.port)
