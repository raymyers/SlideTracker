import com.bleedingwolf.ratpack.Ratpack
import com.bleedingwolf.ratpack.RatpackServlet
import org.json.JSONObject
import com.cadrlife.jhaml.JHaml
import static groovyx.net.http.ContentType.JSON
import groovyx.net.http.RESTClient
import groovy.text.GStringTemplateEngine

def environment = args[0]

def config = new ConfigSlurper(environment).parse(new File('config.groovy').toURL())

def couch = new RESTClient("http://${config.couch.host}:${config.couch.port}/")
couch.auth.basic config.couch.username, config.couch.password

def db = config.couch.db

def haml(String fileName) {
    new JHaml().parse(new File(fileName).text)
}

def haml(String fileName, binding) {
    def gsp = new JHaml().parse(new File(fileName).text)
    def engine = new GStringTemplateEngine()
    def template = engine.createTemplate(new StringReader(gsp)).make(binding)
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
        def response = couch.get(
            path: "/${db}/_design/slidetracker/_view/all_groups",
            contentType: JSON)
        def groups = response.data.rows.collect {it.value}
        haml "views/_groups.haml", [groups: groups]
    }

    get("/_edit_group") {
        def id = params.id
        def response = couch.get(
            path: "/${db}/${id}",
            contentType: JSON)
        def group = response.data
        haml "views/_edit_group.haml", [group: group, isNew:false]
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
}

RatpackServlet.serve(app, config.app.port)
