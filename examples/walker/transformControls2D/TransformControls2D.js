/* eslint-disable */

/**
 * @author walker https://github.com/liumingzw
 */

// import * as THREE from 'three';
/**
 * All transformations are in world.
 * All the positions, rotations, scale refer to world.
 * @param camera
 * @param domElement
 * @constructor
 */
THREE.TransformControls2D = function (camera, domElement) {
    THREE.Object3D.call(this);

    this.enabled = true;
    this.enabledTranslate = true;
    this.enabledScale = true;
    this.enabledRotate = true;

    this.uniformScale = true;

    var scope = this;
    var object = null; // attached object
    var objectOriginUp = new THREE.Vector3();
    var mode = null; // rotate, translate, scale
    const raycaster = new THREE.Raycaster();

    const gizmoArr = [];
    const gizmoGroup = new THREE.Group();
    // gizmo id of scale
    // 2  6  1
    // 7     5
    // 3  8  4
    const scaleGizmoGroup = new THREE.Group();
    const translateGizmoGroup = new THREE.Group();
    const rotateGizmoGroup = new THREE.Group();
    const dashedLineFrameGizmoGroup = new THREE.Group();

    // all the following positions are world position
    var translateStartPos = new THREE.Vector3();
    var translateEndPos = new THREE.Vector3();
    var translateDeltaPos = new THREE.Vector3();


    // width first: 1, 5, 4, 2, 7, 3
    // height first: 6, 8
    var scaleFirst = '';
    var scalePivot = ''; // top_left, top_right, bottom_left, bottom_right
    var scalePivotPos = new THREE.Vector3();
    var scaleEndPos = new THREE.Vector3();


    function addListeners() {
        domElement.addEventListener('mousedown', onMouseDown, false);
        domElement.addEventListener('mousemove', onMouseMove, true);
        domElement.addEventListener('mouseup', onMouseUp, false);
    }

    function removeListeners() {
        domElement.removeEventListener('mousedown', onMouseDown, false);
        domElement.removeEventListener('mousemove', onMouseMove, true);
        domElement.removeEventListener('mouseup', onMouseUp, false);
    }

    function dispose() {
		removeListeners();
    }

    function onMouseDown(event) {
        if (!object || !scope.enabled){
            return;
        }

        if (!scope.enabledTranslate && !scope.enabledRotate && !scope.enabledScale){
            return;
        }

        if (event.button === THREE.MOUSE.LEFT){
            event.preventDefault();
            raycaster.setFromCamera(ThreeUtils.getMouseXY(event, domElement), camera);
            var intersects = raycaster.intersectObjects(gizmoArr);
            if (intersects.length > 0) {
                const gizmo = intersects[0].object;
                mode = gizmo.name;
                if (mode === 'translate'){
                    translateStartPos.copy(ThreeUtils.getEventWorldPosition(event, domElement, camera));
                } else if (mode.indexOf('scale') !== -1){
                    var pivotName = '';
                    switch (mode) {
                        case 'scale1':
                            pivotName = 'scale3';
                            scalePivot = 'bottom_left';
                            break;
                        case 'scale2':
                            pivotName = 'scale4';
                            scalePivot = 'bottom_right';
                            break;
                        case 'scale3':
                            pivotName = 'scale1';
                            scalePivot = 'top_right';
                            break;
                        case 'scale4':
                            pivotName = 'scale2';
                            scalePivot = 'top_left';
                        case 'scale5':
                        case 'scale8':
                            pivotName = 'scale2';
                            scalePivot = 'top_left';
                            break;
                        case 'scale7':
                            pivotName = 'scale1';
                            scalePivot = 'top_right';
                            break;
                        case 'scale6':
                            pivotName = 'scale3';
                            scalePivot = 'bottom_left';
                            break;
                    }
                    switch (mode) {
                        case 'scale1':
                        case 'scale2':
                        case 'scale3':
                        case 'scale4':
                        case 'scale5':
                        case 'scale7':
                            scaleFirst = 'width';
                            break;
                        case 'scale6':
                        case 'scale8':
                            scaleFirst = 'height';
                            break;
                    }
                    const pivotObject = scaleGizmoGroup.getObjectByName(pivotName);
                    scalePivotPos = ThreeUtils.getObjectWorldPosition(pivotObject);
                }
            }
        }
    }

    function onMouseMove(event) {
        // change mouse cursor
        raycaster.setFromCamera(ThreeUtils.getMouseXY(event, domElement), camera);
        var intersects = raycaster.intersectObjects(gizmoArr);
        if (intersects.length > 0) {
            const gizmo = intersects[0].object;
            setMouseCursor(gizmo.name);
        } else {
            setMouseCursor(null);
        }

        if (!object || !mode || !scope.enabled){
            return;
        }

        if (!scope.enabledTranslate && !scope.enabledRotate && !scope.enabledScale){
            return;
        }

        switch (mode) {
            case 'translate':
                handleMouseMoveTranslate(event);
                break;
            case 'rotate':
                handleMouseMoveRotate(event);
                break;
            default: // scale
                handleMouseMoveScale(event);
                break;
        }
    }

    function onMouseUp(event) {
        mode = null;
    }

    function attach(obj) {
        if (object !== obj){
            object = obj;
            objectOriginUp = new THREE.Vector3(0, 1, 0);
            objectOriginUp.applyQuaternion(ThreeUtils.getObjectWorldQuaternion(obj));
            updateGizmo();
        }
    }

    function detach() {
        object = null;
        updateGizmo();
    }

    function updateGizmo() {
        if (!object || !scope.enabled){
            gizmoGroup.visible = false;
            return;
        }
        if (!scope.enabledTranslate && !scope.enabledRotate && !scope.enabledScale){
            gizmoGroup.visible = false;
            return;
        }
        gizmoGroup.visible = true;

        translateGizmoGroup.visible = scope.enabledTranslate;
        scaleGizmoGroup.visible = scope.enabledScale;
        rotateGizmoGroup.visible = scope.enabledRotate;

        // make world position, world rotation of both equal
        ThreeUtils.setObjectWorldPosition(gizmoGroup, ThreeUtils.getObjectWorldPosition(object));

        // var q = ThreeUtils.getObjectWorldQuaternion(object);
        // q.normalize();
        // gizmoGroup.setRotationFromQuaternion(q);

        ThreeUtils.setObjectWorldQuaternion(gizmoGroup, ThreeUtils.getObjectWorldQuaternion(object));

        const worldScale = new THREE.Vector3();
        object.getWorldScale(worldScale);
        const originSize2D = ThreeUtils.getGeometrySize(object.geometry, true);
        const width = originSize2D.x * worldScale.x;
        const height = originSize2D.y * worldScale.y;

        if(scope.enabledTranslate) {
            const translateGizmo = translateGizmoGroup.getObjectByName('translate');
            translateGizmo.scale.set(width, height, 1);
        }

        if (scope.enabledScale){
            const offset = 2.5;
            const name = 'scale';
            const z = 0;
            scaleGizmoGroup.getObjectByName(name + 1).position.set(width/2 + offset, height/2 + offset, z);
            scaleGizmoGroup.getObjectByName(name + 2).position.set(-width/2 - offset, height/2 + offset, z);
            scaleGizmoGroup.getObjectByName(name + 3).position.set(-width/2 - offset, -height/2 - offset, z);
            scaleGizmoGroup.getObjectByName(name + 4).position.set(width/2 + offset, -height/2 - offset, z);

            scaleGizmoGroup.getObjectByName(name + 5).position.set(width/2 + offset, 0, z);
            scaleGizmoGroup.getObjectByName(name + 6).position.set(0, height/2 + offset, z);
            scaleGizmoGroup.getObjectByName(name + 7).position.set(-width/2 - offset, 0, z);
            scaleGizmoGroup.getObjectByName(name + 8).position.set(0, -height/2 - offset, z);
        }

        if (scope.enabledRotate){
            const rotateGizmo = rotateGizmoGroup.getObjectByName('rotate');
            rotateGizmo.position.x = 0;
            rotateGizmo.position.y = height/2 + 16;
        }

        {
            const offset = 1;
            const z = 0;
            const line = dashedLineFrameGizmoGroup.children[0];
            const geometry = line.geometry; //new THREE.Geometry();
            geometry.vertices = [];
            geometry.vertices.push(new THREE.Vector3(width/2 + offset, height/2 + offset, z));
            geometry.vertices.push(new THREE.Vector3(-width/2 - offset, height/2 + offset, z));
            geometry.vertices.push(new THREE.Vector3(-width/2 - offset, -height/2 - offset, z));
            geometry.vertices.push(new THREE.Vector3(width/2 + offset, -height/2 - offset, z));
            geometry.vertices.push(new THREE.Vector3(width/2 + offset, height/2 + offset, z));
            geometry.verticesNeedUpdate = true;
            line.computeLineDistances();
        }
    }

    function generateScaleGizmo() {
        var scaleGizmo = new THREE.Mesh (
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshBasicMaterial({ color: 0x000000, visible: false, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
        );
        {
            var geometry = new THREE.CircleGeometry( 2.5, 32 );
            var material = new THREE.MeshBasicMaterial( { color: 0x000000 } );
            var circle = new THREE.Mesh( geometry, material );
            scaleGizmo.add( circle );
        }
        {
            var geometry = new THREE.CircleGeometry( 1.5, 32 );
            var material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
            var circle = new THREE.Mesh( geometry, material );
            scaleGizmo.add( circle );
        }
        return scaleGizmo;
    }

    function generateRotateGizmo() {
        var rotateGizmo = new THREE.Mesh (
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshBasicMaterial({ color: 0x000000, visible: false, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
        );
        {
            var geometry = new THREE.CircleGeometry( 2.5, 32 );
            var material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
            var circle = new THREE.Mesh( geometry, material );
            rotateGizmo.add( circle );
        }
        {
            var geometry = new THREE.CircleGeometry( 1.5, 32 );
            var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
            var circle = new THREE.Mesh( geometry, material );
            rotateGizmo.add( circle );
        }
        {
            var geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3( 0, -2, 0) );
            geometry.vertices.push(new THREE.Vector3( 0, -10, 0) );
            var line = new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0x0000ff }) );
            rotateGizmo.add(line);
        }
        return rotateGizmo;
    }

    function initGizmo() {
        gizmoGroup.visible = false;
        scope.add(gizmoGroup);

        gizmoGroup.add(translateGizmoGroup);
        gizmoGroup.add(scaleGizmoGroup);
        gizmoGroup.add(rotateGizmoGroup);
        gizmoGroup.add(dashedLineFrameGizmoGroup);

        {
            // dashed line frame
            var geometry = new THREE.Geometry();
            var line = new THREE.Line( geometry, new THREE.LineDashedMaterial( { color: 0x0000ff, dashSize: 3, gapSize: 2 } ) );
            line.computeLineDistances();
            dashedLineFrameGizmoGroup.add(line);
        }
        {
            // translate
            var translateGizmo = new THREE.Mesh (
                new THREE.PlaneGeometry(1, 1),
                new THREE.MeshBasicMaterial({ wireframe: true, visible: false, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
            );
            translateGizmo.name = 'translate';
            translateGizmoGroup.add(translateGizmo);
            gizmoArr.push(translateGizmo);
        }

        {
            // scale
            var scaleGizmo = generateScaleGizmo();
            for (var i = 1; i < 9; i++){
                const gizmo = scaleGizmo.clone();
                gizmo.name = 'scale' + i;
                scaleGizmoGroup.add(gizmo);
                gizmoArr.push(gizmo);
            }
        }

        {
            // rotate
            var rotateGizmo = generateRotateGizmo();
            rotateGizmo.name = 'rotate';
            rotateGizmoGroup.add(rotateGizmo);
            gizmoArr.push(rotateGizmo);
        }
    }

    // todo
    function setMouseCursor(gizmoName){
        // http://www.hangge.com/blog/cache/detail_2065.html
        if (!gizmoName){
            domElement.style.cursor = 'default';
        } else {
            if (gizmoName.indexOf('scale') !== -1){
                domElement.style.cursor = 'ew-resize';
            } else if (gizmoName === 'translate'){
                domElement.style.cursor = 'all-scroll';
            } else if (gizmoName === 'rotate'){
                domElement.style.cursor = 'cell';
            }
        }
    }

    function handleMouseMoveTranslate(event) {
        if (!scope.enabledTranslate) return;

        translateEndPos.copy(ThreeUtils.getEventWorldPosition(event, domElement, camera));
        translateDeltaPos.subVectors(translateEndPos, translateStartPos);
        const targetPos = ThreeUtils.getObjectWorldPosition(object).add(translateDeltaPos);
        ThreeUtils.setObjectWorldPosition(object, targetPos);
        translateStartPos.copy(translateEndPos);

        updateGizmo();
    }

    function handleMouseMoveRotate(event) {
        if (!scope.enabledRotate) return;

        const eventWorldPos = ThreeUtils.getEventWorldPosition(event, domElement, camera);
        const objectWorldPos = ThreeUtils.getObjectWorldPosition(object);
        const v1 = new THREE.Vector3().subVectors(eventWorldPos, objectWorldPos);
        const v2 = objectOriginUp;
        const quaternion = ThreeUtils.getQuaternionBetweenVector3(v1, v2);
        object.setRotationFromQuaternion(quaternion);

        updateGizmo();
    }

    // todo: not as expected when object is rotated
    function handleMouseMoveScale(event) {
        scaleEndPos.copy(ThreeUtils.getEventWorldPosition(event, domElement, camera));

        const size = new THREE.Vector3().subVectors(scaleEndPos, scalePivotPos);
        const rotateZ = object.rotation.z;
        size.applyAxisAngle(new THREE.Vector3(0, 0, 1), -rotateZ );
        if (scope.uniformScale){
            const originSize2D = ThreeUtils.getGeometrySize(object.geometry, true);
            const r = originSize2D.y / originSize2D.x;
            if (scaleFirst === 'width'){
                size.y = size.x * r;
            } else if (scaleFirst === 'height'){
                size.x = size.y / r;
            }
        }
        const targetSize = new THREE.Vector2(Math.abs(size.x), Math.abs(size.y));
        ThreeUtils.scaleObjectToWorldSize(object, targetSize, scalePivot);

        updateGizmo();
    }

    addListeners();
    initGizmo();

    // API
    this.dispose = dispose;
    this.attach = attach;
    this.detach = detach;
};

THREE.TransformControls2D.prototype = Object.assign( Object.create( THREE.Object3D.prototype ), {
    constructor: THREE.TransformControls2D
} );


ThreeUtils = {
    getQuaternionBetweenVector3: function (v1, v2) {
        // https://stackoverflow.com/questions/1171849/finding-quaternion-representing-the-rotation-from-one-vector-to-another
        const cross = new THREE.Vector3();
        cross.crossVectors(v2, v1);
        const dot = v1.dot(v2);

        const l1 = v1.length();
        const l2 = v2.length();
        const w = l1 * l2 + dot;
        const x = cross.x;
        const y = cross.y;
        const z = cross.z;

        const quaternion = new THREE.Quaternion(x, y, z, w);
        quaternion.normalize();

        return quaternion;
    },

    // get matrix for rotating v2 to v1. Applying matrix to v2 can make v2 to parallels v1.
    getRotateMatrixBetweenVector3: function (v1, v2){
        const quaternion = ThreeUtils.getQuaternionBetweenVector3(v1, v2);
        const matrix4 = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
        return matrix4;
    },

    getMouseXY: function(event, domElement) {
        var rect = domElement.getBoundingClientRect();
        return new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        )
    },

    // get world info
    getObjectWorldPosition: function (object) {
        const result = new THREE.Vector3();
        object.getWorldPosition(result);
        return result;
    },

    getObjectWorldQuaternion: function (object) {
        const result = new THREE.Quaternion();
        object.getWorldQuaternion (result);
        return result;
    },

    getObjectWorldScale: function (object) {
        const result = new THREE.Vector3();
        object.getWorldScale(result);
        return result;
    },

    getEventWorldPosition: function (event, domElement, camera) {
        var rect = domElement.getBoundingClientRect();
        var tempVector3 = new THREE.Vector3();

        // the x&y in standard thereejs coordinate
        // standardX, standardY: [-1, 1]
        const standardX =  ((event.clientX - rect.left) / rect.width ) * 2 - 1;
        const standardY = -((event.clientY - rect.top) / rect.height ) * 2 + 1;

        tempVector3.set(standardX, standardY, 0.5);

        tempVector3.unproject(camera );
        tempVector3.sub(camera.position ).normalize();
        var distance = -camera.position.z / tempVector3.z;

        var result = new THREE.Vector3().copy(camera.position).add(tempVector3.multiplyScalar(distance));
        return result;
    },

    // set world transformation
    setObjectWorldPosition: function(object, position){
        const parent = object.parent;
        parent.updateMatrixWorld();
        const matrix = new THREE.Matrix4().getInverse(parent.matrixWorld);
        position.applyMatrix4(matrix);
        object.position.copy(position);
    },

    setObjectWorldScale: function (object, scale) {
        var localScale = object.parent.worldToLocal(scale);
        object.scale.copy(localScale);
    },

    setObjectWorldQuaternion: function (object, quaternion) {
        // inverse parent rotation
        const parentQuaternion = ThreeUtils.getObjectWorldQuaternion(object.parent);
        object.applyQuaternion(parentQuaternion.inverse());

        quaternion.normalize();
        object.setRotationFromQuaternion(quaternion);
    },

    scaleObjectToWorldSize: function (object, targetSize, pivot) {
        const originSize2D = ThreeUtils.getGeometrySize(object.geometry, true);

        const originPos = ThreeUtils.getObjectWorldPosition(object);
        const originScale = ThreeUtils.getObjectWorldScale(object);

        const scaleX = targetSize.x / originSize2D.x;
        const scaleY = targetSize.y / originSize2D.y;

        const worldScale = new THREE.Vector3(scaleX, scaleY, 1);
        ThreeUtils.setObjectWorldScale(object, worldScale );

        const deltaX = (scaleX - originScale.x) * originSize2D.x;
        const deltaY = (scaleY - originScale.y) * originSize2D.y;

        const newPos = originPos.clone();
        const delta = new THREE.Vector3();
        switch (pivot) {
            case 'top_left':
                delta.x = deltaX / 2;
                delta.y = -deltaY / 2;
                break;
            case 'top_right':
                delta.x = -deltaX / 2;
                delta.y = -deltaY / 2;
                break;
            case 'bottom_left':
                delta.x = deltaX / 2;
                delta.y = deltaY / 2;
                break;
            case 'bottom_right':
                delta.x = -deltaX / 2;
                delta.y = deltaY / 2;
                break;
            default: // center
                break;
        }
        newPos.add(delta);
        ThreeUtils.setObjectWorldPosition(object, newPos);
    },

    getGeometrySize: function (geometry, is2D) {
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const size = new THREE.Vector3(
            box.max.x - box.min.x,
            box.max.y - box.min.y,
            box.max.z - box.min.z
        );
        if (is2D){
            return new THREE.Vector3(size.x, size.y);
        } else {
            return size;
        }
    }

};


// export default THREE.TransformControls2D;