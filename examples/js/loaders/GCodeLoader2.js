'use strict';

function Layer ( lines, index, z, name ) {

	this.lines = lines;
	this.index = index;
	this.z = z;
	this.name = name;

}

function LineUserData ( type, index ) {

    this.type = type;
    this.index = index;

}

THREE.GCodeLoader2 = function ( manager ) {

    this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

    this.init();

};

THREE.GCodeLoader2.prototype.init = function() {

    this.visibleLayerCount = 0;

    this.layer_height = 0.2;

    this.layerCount = 0;

    this.state = { x: -Infinity, y: -Infinity, z: -Infinity, e: 0, f: 0, line_type: 'UNKNOWN', layer_index : -Infinity };

    this.layers = [];

    this.materials = {

        'WALL-INNER' : new THREE.LineBasicMaterial( { color: 0x00FF00, linewidth: 2 } ), //Sun_green
        'WALL-OUTER' : new THREE.LineBasicMaterial( { color: 0xFF2121, linewidth: 2 } ), //Sun_red
        'SKIN' : new THREE.LineBasicMaterial( { color: 0xFFFF00, linewidth: 2 } ), //Sun_yellow
        'SKIRT' : new THREE.LineBasicMaterial( { color: 0xFa8c35, linewidth: 2 } ), //Sun_orange
        'SUPPORT' : new THREE.LineBasicMaterial( { color: 0x4b0082, linewidth: 2 } ), //Sun_indigo
        'FILL' : new THREE.LineBasicMaterial( { color: 0x8d4bbb, linewidth: 2 } ), //Sun_purple
        'UNKNOWN' : new THREE.LineBasicMaterial( { color: 0x4b0082, linewidth: 2 } ) //Sun_indigo

    }

    //line array: split by line type
    this.typeLineArrays = {

        'WALL-INNER' : [] ,
        'WALL-OUTER' : [],
        'SKIN' : [],
        'SKIRT' : [],
        'SUPPORT' : [],
        'FILL' : [],
        'UNKNOWN' : []

    }

    this.typeVisibility = {

        'WALL-INNER' : true,
        'WALL-OUTER' : true,
        'SKIN' : true,
        'SKIRT' : true,
        'SUPPORT' : true,
        'FILL' : true,
        'UNKNOWN' : true

    }
}

THREE.GCodeLoader2.prototype.load = function ( url, onLoad, onProgress, onError ) {

	var scope = this;

	var loader = new THREE.FileLoader( scope.manager );
	loader.load( url, function ( text ) {

		onLoad( scope.parse( text ) );

	}, onProgress, onError );

};

//show those layers
THREE.GCodeLoader2.prototype.showLayers = function ( count ) {

    count = ( count < 0 ? 0 : count );
    count = ( count > this.layerCount ? this.layerCount : count );

    this.visibleLayerCount = count;

    for ( var i = 0; i < this.layers.length; i++ ) {
        var index = this.layers[ i ].index;
        for ( var k = 0; k < this.layers[ i ].lines.length; k++ ) {
            var type = this.layers[ i ].lines[ k ].userData.type;
            var visible = ( index <= this.visibleLayerCount ) && this.typeVisibility[ type ];
            this.layers[ i ].lines[ k ].visible = visible;
        }
    }

}

//show those lines of this type which [line.userData <= this.visibleLayerCount]
THREE.GCodeLoader2.prototype.showType = function ( type ) {

    if ( !this.typeLineArrays[ type ] ) {
        console.warn( 'THREE.GCodeLoader2: error type:' + type );
        return;
    }

    var lineArray = this.typeLineArrays[ type ];

    for ( var i = 0; i < lineArray.length; i++ ) {
        lineArray[ i ].visible = ( lineArray[ i ].userData.index <= this.visibleLayerCount );
    }

    this.typeVisibility[ type ] = true;

}

//hide all lines of this type
THREE.GCodeLoader2.prototype.hideType = function ( type ) {

    if ( this.typeLineArrays[ type ] === undefined ) {
        console.warn( 'THREE.GCodeLoader2: error type:' + type );
        return;
    }

    var lineArray = this.typeLineArrays[ type ];

    for ( var i = 0; i < lineArray.length; i++) {
        lineArray[ i ] .visible = false;
    }

    this.typeVisibility[ type ] = false;

}

THREE.GCodeLoader2.prototype.parse = function ( data ) {

    this.init();

	var scope = this;

    var verticeBuffer = [];

	var lineBuffer = [];

    var object = new THREE.Group();
    object.name = 'gcode';

    var startRender = false;

	function newLine ( ) {

        if ( verticeBuffer.length === 0){
        	return;
        }

        var geometry = new THREE.Geometry();

        //deep copy
        geometry.vertices = verticeBuffer.concat();
        //clear
        verticeBuffer.splice( 0, verticeBuffer.length );

		var type = scope.state.line_type;

        //select color by type
        var material = scope.materials[ type ] || scope.materials[ 'UNKNOWN' ];
        var line = new THREE.Line( geometry, material );
        line.userData = new LineUserData( type, scope.layerCount );

        lineBuffer.push( line );

        scope.typeLineArrays[ type ].push( line );

        object.add( line );

    }

    function newLayer () {

	    if ( lineBuffer.length === 0 ){
	        return;
        }

        scope.layerCount ++;

		//deep copy
		var lines = lineBuffer.concat();
        //clear
        lineBuffer.splice( 0, lineBuffer.length );

		var layer = new Layer( lines, scope.layerCount, scope.state.z );

		scope.layers.push( layer );

    }

    var gcodeLines = data.split( '\n' );

	for ( var i = 0; i < gcodeLines.length; i ++ ) {

		var gcodeLine = gcodeLines[ i ];

        // 1. filter key word: ;TYPE: & ;LAYER: & ;Layer height:
        if( gcodeLine.trim().indexOf( ';TYPE:' ) === 0 ) {

        	var line_type = gcodeLine.replace( ';TYPE:', '' );

        	if ( line_type !== scope.state.line_type ) {
				newLine();
			}

            scope.state.line_type = line_type;

        	continue;

		}else if( gcodeLine.trim().indexOf( ';LAYER:' ) === 0 ) {

            var layer_index = parseInt( gcodeLine.replace( ';LAYER:', '' ) );

            if ( layer_index !== scope.state.layer_index ) {
                newLine();
                newLayer();
            }

            scope.state.layer_index = layer_index;

            continue;

        }else if( gcodeLine.trim().indexOf( ';Layer height:' ) === 0 ) {

            scope.layer_height = parseFloat( gcodeLine.replace( ';Layer height:', '' ) );

            console.log( 'layer_height  ' + scope.layer_height );

            continue;

        }

        // 2. ignore comments
		if ( gcodeLine.indexOf(';') !== -1 ) {
            gcodeLine = gcodeLine.split( ';' )[0];
		}

        // 3. ignore empty string
		if ( gcodeLine.trim().length === 0 ) {
            continue;
		}

		var tokens = gcodeLine.split( ' ' );  // G1,F1080,X91.083,Y66.177,E936.7791
		var cmd = tokens[ 0 ].toUpperCase();   // G0 or G1 or G92 or M107

		//Argumments
		var args = {};
		tokens.splice( 1 ).forEach( function ( token ) {

			if ( token[ 0 ] !== undefined ) {

				var key = token[ 0 ].toLowerCase();  // G/M
				var value = parseFloat( token.substring( 1 ) );
				args[ key ] = value;  // {"f":990,"x":39.106,"y":73.464,"e":556.07107}

			}

		} );

        //Process commands
		if ( cmd === 'G28' ) {

            //G28: http://marlinfw.org/docs/gcode/G028.html
            // (x=0 && y=0 && z=0) is mark of start render

            scope.state.x = 0;
            scope.state.y = 0;
            scope.state.z = 0;

            startRender = true;
            console.log('startRender ...');

            //todo : 2 cases
            //case-1 : G28
            //case-2 : G28

        } else if ( cmd === 'G0' || cmd === 'G1' ) {

		    if ( !startRender ) {
                continue;
            }

            scope.state.x = ( args.x || scope.state.x );
            scope.state.y = ( args.y || scope.state.y );
            scope.state.z = ( args.z || scope.state.z );

            verticeBuffer.push( new THREE.Vector3( scope.state.x, scope.state.y, scope.state.z ) );

		} else if ( cmd === 'G2' || cmd === 'G3' ) {

			//G2/G3 - Arc Movement ( G2 clock wise and G3 counter clock wise )
			console.warn( 'THREE.GCodeLoader2: Arc command not supported' );

		} else if ( cmd === 'G90' ) {

			//G90: Set to Absolute Positioning

		} else if ( cmd === 'G91' ) {

			//G91: Set to state.relative Positioning

		} else if ( cmd === 'G92' ) {

			//G92: Set Position

		} else {

			// console.warn( 'THREE.GCodeLoader2: Command not supported:' + cmd );

		}

	}

	//process buffer
    newLine();
    newLayer();

    console.log( 'layer count:' + scope.layerCount );

	object.rotation.set( - Math.PI / 2, 0, 0 );

	return object;

};
