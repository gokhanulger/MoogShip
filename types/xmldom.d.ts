declare module 'xmldom' {
  export class DOMImplementation {
    createDocument(namespaceURI: string, qualifiedName: string, doctype: any): Document;
  }
  
  export class XMLSerializer {
    serializeToString(node: Node): string;
  }
}