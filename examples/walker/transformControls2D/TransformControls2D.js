/* eslint-disable */

/**
 * @author walker https://github.com/liumingzw
 */

// import * as THREE from 'three';

THREE.TransformControls2D = function ( camera, domElement) {
    THREE.Object3D.call( this );
    this.camera = camera;
    this.domElement = domElement;

    this.object = null;
    this.frame = null;

    scope = this;

    var points = new THREE.Object3D();

    var selectedPoint = null;

    var raycaster = new THREE.Raycaster();

    function addListeners() {
        scope.domElement.addEventListener('mousedown', onMouseDown, false);
        scope.domElement.addEventListener( 'mousemove', onMouseMove, true );
    }

    function removeListeners() {
        scope.domElement.removeEventListener('mousedown', onMouseDown, false);
        scope.domElement.removeEventListener( 'mousemove', onMouseMove, true );
    }

    function dispose() {
		removeListeners();
    }

    function onMouseDown(event) {
        // only detect when left-mouse-down
        if (event.button === THREE.MOUSE.LEFT){
            event.preventDefault();
            raycaster.setFromCamera(getMousePosition(event), camera);
            var intersects = raycaster.intersectObjects(points.children);
            if (intersects.length > 0) {
                selectedPoint = intersects[0].object;
                selectedPoint.material.color = new THREE.Color( 0x0000ff);
                console.log('selected point');
            }
        } else {
            selectedPoint = null;
        }
    }

    function onMouseMove(event) {
        if (event.button === THREE.MOUSE.LEFT){
            event.preventDefault();
            if (scope.frame && selectedPoint){
                var pos = getWorldPosition(event);
                selectedPoint.position.x = pos.x;
                selectedPoint.position.y = pos.y;
            }
        }
    }

    function getMousePosition(event) {
        var rect = domElement.getBoundingClientRect();
        return new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
		)
    }


    function getWorldPosition(event) {
        var rect = scope.domElement.getBoundingClientRect();
        var vec = new THREE.Vector3();
        var pos = new THREE.Vector3();

        // the x&y in standard thereejs coordinate
        // standardX, standardY: [-1, 1]
        const standardX =  ((event.clientX - rect.left) / rect.width ) * 2 - 1;
        const standardY = -((event.clientY - rect.top) / rect.height ) * 2 + 1;

        vec.set(standardX, standardY, 0.5);

        vec.unproject( scope.camera );
        vec.sub( scope.camera.position ).normalize();
        var distance = - scope.camera.position.z / vec.z;

        pos.copy( scope.camera.position ).add( vec.multiplyScalar( distance ) );
        return new THREE.Vector2(pos.x, pos.y);
    }


    function attach( object ) {
        scope.object = object;
        addFrame(object);
    }

    function detach() {
        scope.object = undefined;
    }

    function addFrame(object) {
        if (scope.frame) {
            scope.remove(scope.frame);
        }

        if (points) {
            scope.remove(points);
        }

        var box3 = new THREE.Box3();
        box3.setFromObject(object);

        // var helper = new THREE.Box3Helper( box3, 0xff0000 );
        // object.updateMatrixWorld();
        // var matrix = object.matrixWorld;
        // helper.applyMatrix(matrix);
        // scope.frame = helper;
        // scope.add(scope.frame);

        // 4 3
        // 1 2
        // init p1, p2, p3, p4
        var offset = 3;
        var min = box3.min;
        var max = box3.max;
        var vec1 = new THREE.Vector3(min.x-offset, min.y-offset, 0);
        var vec2 = new THREE.Vector3(max.x+offset, min.y-offset, 0);
        var vec3 = new THREE.Vector3(max.x+offset, max.y+offset, 0);
        var vec4 = new THREE.Vector3(min.x-offset, max.y+offset, 0);

        var material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
        var geometry = new THREE.Geometry();
        geometry.vertices.push(vec1 );
        geometry.vertices.push(vec2 );
        geometry.vertices.push(vec3 );
        geometry.vertices.push(vec4 );
        geometry.vertices.push(vec1 );
        var line = new THREE.Line( geometry, material );
        scope.frame = line;
        scope.frame.name = 'frame';
        scope.add(scope.frame);

        // 4 points
        var pointsMaterial = new THREE.PointsMaterial( { color: 0x888888, size: 40 } );
        {
            var pointGeometry = new THREE.Geometry();
            pointGeometry.vertices.push(vec1);
            var p1 = new THREE.Points( pointGeometry, pointsMaterial.clone() );
            points.add(p1);
        }
        {
            var pointGeometry = new THREE.Geometry();
            pointGeometry.vertices.push(vec2);
            var p2 = new THREE.Points( pointGeometry, pointsMaterial.clone() );
            points.add(p2);
        }
        {
            var pointGeometry = new THREE.Geometry();
            pointGeometry.vertices.push(vec3);
            var p3 = new THREE.Points( pointGeometry, pointsMaterial.clone() );
            points.add(p3);
        }
        {
            var pointGeometry = new THREE.Geometry();
            pointGeometry.vertices.push(vec4);
            var p4 = new THREE.Points( pointGeometry, pointsMaterial.clone() );
            points.add(p4);
        }
        scope.add(points);
    }
	// addListeners();
    //
	// // API
	// this.enabled = true;
	// this.dispose = dispose;

    this.attach = attach;
    this.detach = detach;

    addListeners();
};

THREE.TransformControls2D.prototype = Object.assign( Object.create( THREE.Object3D.prototype ), {
    constructor: THREE.TransformControls2D
} );

// export default THREE.IntersectDetector;