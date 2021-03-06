/**
 * Created by easterCat on 2018/4/12.
 */
import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {nextUid, format} from '../utils/strings'
import {deepEqual, objectAssign} from '../utils/objects'
import {getLang} from '../lang'
import ajax from './util/ajaxRequest'
import {UPLOADING, ERROR} from './status'
import _ from 'Util'

export default function (Origin) {
    class Upload extends Component {
        constructor(props) {
            super(props)
            this.state = {
                files: {},
                value: props.value
            }

            this.addFile = this.addFile.bind(this)
            this.uploadFile = this.uploadFile.bind(this)
            this.removeFile = this.removeFile.bind(this)
            this.removeValue = this.removeValue.bind(this)
        }

        componentWillReceiveProps(nextProps) {
            if (!deepEqual(nextProps.value, this.props.value) &&
                !deepEqual(nextProps.value, this.state.value)) {
                this.setState({value: nextProps.value})
            }
        }

        handleChange(value) {
            if (value === undefined) {
                if (Object.keys(this.state.files).length === 0) {
                    value = this.state.value
                } else {
                    value = new Error('')
                }
            }
            this.props.onChange(value)
        }

        addFile(input, handle) {
            const {fileSize} = this.props
            let files = {...this.state.files}

            for (let i = 0; i < input.files.length; i++) {
                let blob = input.files[i]

                let id = nextUid()
                let file = {
                    name: blob.name,
                    process: 0,
                    status: UPLOADING
                }

                files[id] = file

                if (blob.size / 1024 > fileSize) {
                    let message = format(getLang('validation.tips.fileSize'), '', fileSize)
                    file.status = ERROR
                    file.message = message
                    file.name = message
                    this.setState({files})
                    return
                }

                if (handle) {
                    handle(files[id], blob, (f) => {
                        if (f.status !== ERROR) {
                            f.xhr = this.uploadFile(id, blob)
                        }
                        this.setState({files})
                    })
                } else {
                    file.xhr = this.uploadFile(id, blob)
                    this.setState({files})
                }
            }
        }

        uploadFile(id, file) {
            let {onUpload, action, name, inputName, cors, params, withCredentials} = this.props

            return ajax({
                url: `http://192.168.1.73:3000/api/v1/files`,
                name: inputName || name,
                cors,
                params,
                withCredentials,
                file,
                onProgress: (e) => {

                    console.log(_)

                    const percentage = (e.loaded / e.total) * 100

                    const {files} = this.state
                    this.setState({
                        files: objectAssign({}, files, {
                            [id]: objectAssign({}, files[id], {process: percentage})
                        })
                    })
                },

                onLoad: (e) => {
                    console.log('load', e)

                    let files = this.state.files
                    let value = e.currentTarget.responseText
                    if (onUpload) {
                        value = onUpload(value)
                    }

                    if (value instanceof Error) {
                        files[id].status = ERROR
                        files[id].name = value.message
                        files[id].message = value.message
                        this.setState({files}, this.handleChange)
                    } else {
                        // remove file
                        delete this.state.files[id]
                        // add value
                        this.setState({
                            value: [...this.state.value, value]
                        }, this.handleChange)
                    }
                },
                onError: () => {
                    let files = this.state.files
                    files[id].status = ERROR
                    files[id].message = getLang('fetch.status.error')
                    this.setState({files})
                    this.handleChange()
                }
            })
        }

        removeFile(id) {
            let files = this.state.files
            let file = files[id]
            if (file.xhr) {
                file.xhr.abort()
            }
            delete files[id]
            this.setState({files})

            this.handleChange()
        }

        removeValue(index) {
            let value = [
                ...this.state.value.slice(0, index),
                ...this.state.value.slice(index + 1)
            ]
            this.setState({value}, this.handleChange)
        }

        render() {
            const {files, value} = this.state
            return (
                <Origin {...this.props}
                        files={files}
                        value={value}
                        onFileAdd={this.addFile}
                        removeFile={this.removeFile}
                        removeValue={this.removeValue}
                />
            )
        }
    }

    Upload.propTypes = {
        accept: PropTypes.string,
        cors: PropTypes.bool,
        disabled: PropTypes.bool,
        fileSize: PropTypes.number,
        inputName: PropTypes.string,
        name: PropTypes.string,
        onChange: PropTypes.func,
        onUpload: PropTypes.func,
        params: PropTypes.object,
        readOnly: PropTypes.bool,
        withCredentials: PropTypes.bool
    }

    Upload.defaultProps = {
        value: []
    }

    return Upload
}
