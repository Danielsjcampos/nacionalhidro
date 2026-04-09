import { SignedXml } from 'xml-crypto';
import { DOMParser } from '@xmldom/xmldom';
import axios from 'axios';

// WSDLs e Endpoints da Prefeitura Municipal de Campinas (ABRASF 2.03)
const NFSE_URL_PRODUCAO = 'https://novanfse.campinas.sp.gov.br/notafiscal-abrasfv203-ws/NotaFiscalSoap';
const NFSE_URL_HOMOLOGACAO = 'https://homol-rps.ima.sp.gov.br/notafiscal-abrasfv203-ws/NotaFiscalSoap';

export class NfseCampinasService {
    private readonly ambient: 'HOMOLOGACAO' | 'PRODUCAO';
    private readonly privateKeyPem: string;
    private readonly certificatePem: string;

    constructor(ambient: 'HOMOLOGACAO' | 'PRODUCAO' = 'HOMOLOGACAO', privateKeyPem: string, certificatePem: string) {
        this.ambient = ambient;
        this.privateKeyPem = privateKeyPem;
        this.certificatePem = certificatePem; // O certificado público sem as tags header/footer
    }

    private getEndpointUrl(): string {
        return this.ambient === 'PRODUCAO' ? NFSE_URL_PRODUCAO : NFSE_URL_HOMOLOGACAO;
    }

    /**
     * Assina a tag principal do XML conforme padrão da ABRASF/ICP-Brasil 
     */
    private signXml(xml: string, tagToSign: string): string {
        const sig = new (SignedXml as any)();
        sig.addReference(
            `//*[local-name(.)='${tagToSign}']`, 
            ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"]
        );
        sig.signingKey = this.privateKeyPem;
        sig.keyInfoProvider = new KeyInfo(this.certificatePem);
        sig.computeSignature(xml);
        return sig.getSignedXml();
    }

    /**
     * Construção Simplificada do Lote RPS (Apenas ilustrativo base do modelo legado -> ABRASF v2.03)
     */
    public async emitirRps(fatura: any, empresa: any, cliente: any) {
        // RPS Node properties
        const numero = fatura.numero || Math.floor(Math.random() * 100000).toString();
        const strXml = `
            <EnviarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
                <LoteRps Id="Lote_${numero}" versao="2.03">
                    <NumeroLote>${numero}</NumeroLote>
                    <Cnpj>${empresa.cnpj.replace(/\D/g, '')}</Cnpj>
                    <InscricaoMunicipal>${empresa.inscricaoMunicipal}</InscricaoMunicipal>
                    <QuantidadeRps>1</QuantidadeRps>
                    <ListaRps>
                        <Rps>
                            <InfDeclaracaoPrestacaoServico Id="Rps_${numero}">
                                <Rps>
                                    <IdentificacaoRps>
                                        <Numero>${numero}</Numero>
                                        <Serie>1</Serie>
                                        <Tipo>1</Tipo>
                                    </IdentificacaoRps>
                                    <DataEmissao>${new Date().toISOString()}</DataEmissao>
                                    <Status>1</Status>
                                </Rps>
                                <Servico>
                                    <Valores>
                                        <ValorServicos>${fatura.valorBruto}</ValorServicos>
                                        <ValorIss>${fatura.valorISS || 0}</ValorIss>
                                    </Valores>
                                    <IssRetido>2</IssRetido>
                                    <ItemListaServico>${empresa.listaServicos || '14.01'}</ItemListaServico>
                                    <CodigoTributacaoMunicipio>${empresa.tributacaoMunicipio || '14.01'}</CodigoTributacaoMunicipio>
                                    <Discriminacao>${fatura.observacoes || 'Servicos prestados'}</Discriminacao>
                                    <CodigoMunicipio>${empresa.codigoMunicipio || '3509502'}</CodigoMunicipio>
                                    <ExigibilidadeISS>1</ExigibilidadeISS>
                                    <MunicipioIncidencia>${empresa.codigoMunicipio || '3509502'}</MunicipioIncidencia>
                                </Servico>
                                <Prestador>
                                    <CpfCnpj>
                                        <Cnpj>${empresa.cnpj.replace(/\D/g, '')}</Cnpj>
                                    </CpfCnpj>
                                    <InscricaoMunicipal>${empresa.inscricaoMunicipal}</InscricaoMunicipal>
                                </Prestador>
                                <Tomador>
                                    <IdentificacaoTomador>
                                        <CpfCnpj>
                                            <Cnpj>${cliente.documento.replace(/\D/g, '')}</Cnpj>
                                        </CpfCnpj>
                                    </IdentificacaoTomador>
                                    <RazaoSocial>${cliente.razaoSocial || cliente.nome}</RazaoSocial>
                                    <Endereco>
                                        <Endereco>${cliente.endereco}</Endereco>
                                        <Numero>${cliente.numero}</Numero>
                                        <Bairro>${cliente.bairro}</Bairro>
                                        <CodigoMunicipio>3509502</CodigoMunicipio>
                                        <Uf>${cliente.estado}</Uf>
                                        <Cep>${cliente.cep?.replace(/\D/g, '')}</Cep>
                                    </Endereco>
                                </Tomador>
                            </InfDeclaracaoPrestacaoServico>
                        </Rps>
                    </ListaRps>
                </LoteRps>
            </EnviarLoteRpsEnvio>
        `;

        // Assinar RPS
        const signedXml = this.signXml(strXml, 'InfDeclaracaoPrestacaoServico');
        
        // Montar Envelope SOAP 1.1
        const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:nfse="http://nfse.campinas.sp.gov.br/">
           <soapenv:Header/>
           <soapenv:Body>
              <nfse:RecepcionarLoteRps>
                 <nfse:xmlEnvio><![CDATA[${signedXml}]]></nfse:xmlEnvio>
              </nfse:RecepcionarLoteRps>
           </soapenv:Body>
        </soapenv:Envelope>`;

        try {
            const config = {
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': 'http://nfse.campinas.sp.gov.br/RecepcionarLoteRps'
                }
            };
            const response = await axios.post(this.getEndpointUrl(), soapEnvelope, config);
            
            // Retorna o corpo do SOAP para parsing
            return this.parseSoapResponse(response.data);
        } catch (error: any) {
            console.error('[Nfse Campinas] Falha na emissão SOAP', error?.response?.data || error);
            throw new Error('Falha de Comunicação com a PMSP Campinas');
        }
    }

    private parseSoapResponse(soapBody: string) {
        // Abstração de parsing do XML Result para capturar Protocolo / Erros
        const doc = new DOMParser().parseFromString(soapBody, 'text/xml');
        const numeroLoteNode = doc.getElementsByTagName('NumeroLote')[0];
        const msgNode = doc.getElementsByTagName('Mensagem')[0];
        const protocoloNode = doc.getElementsByTagName('Protocolo')[0];
        const nfseNode = doc.getElementsByTagName('Numero')[0];
        const codVerificacaoNode = doc.getElementsByTagName('CodigoVerificacao')[0];
        
        return {
            protocolo: protocoloNode?.textContent || null,
            nfse: nfseNode?.textContent || null,
            codVerificacao: codVerificacaoNode?.textContent || null,
            lote: numeroLoteNode?.textContent || null,
            erro: msgNode?.textContent || null,
            rawResponse: soapBody
        }
    }

    /**
     * Consulta o status de processamento de um lote enviado
     */
    public async consultarLoteRps(empresa: any, protocolo: string) {
        const strXml = `
            <ConsultarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
                <Prestador>
                    <CpfCnpj><Cnpj>${empresa.cnpj.replace(/\D/g, '')}</Cnpj></CpfCnpj>
                    <InscricaoMunicipal>${empresa.inscricaoMunicipal}</InscricaoMunicipal>
                </Prestador>
                <Protocolo>${protocolo}</Protocolo>
            </ConsultarLoteRpsEnvio>
        `;

        const soapEnvelope = this.wrapSoapEnvelope(strXml, 'ConsultarLoteRps');
        return this.sendSoapRequest(soapEnvelope, 'ConsultarLoteRps');
    }

    /**
     * Consulta os dados da NFSe gerada a partir de um RPS específico
     */
    public async consultarNfsePorRps(empresa: any, rps: any) {
        const strXml = `
            <ConsultarNfseRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
                <IdentificacaoRps>
                    <Numero>${rps.numero}</Numero>
                    <Serie>${rps.serie || '1'}</Serie>
                    <Tipo>${rps.tipo || '1'}</Tipo>
                </IdentificacaoRps>
                <Prestador>
                    <CpfCnpj><Cnpj>${empresa.cnpj.replace(/\D/g, '')}</Cnpj></CpfCnpj>
                    <InscricaoMunicipal>${empresa.inscricaoMunicipal}</InscricaoMunicipal>
                </Prestador>
            </ConsultarNfseRpsEnvio>
        `;

        const soapEnvelope = this.wrapSoapEnvelope(strXml, 'ConsultarNfsePorRps');
        return this.sendSoapRequest(soapEnvelope, 'ConsultarNfsePorRps');
    }

    /**
     * Solicita o cancelamento de uma nota emitida
     */
    public async cancelarNfse(empresa: any, nfseNumero: string, codigoCancelamento: string = '1') {
        const strXml = `
            <CancelarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
                <Pedido>
                    <InfPedidoCancelamento Id="Cancel_${nfseNumero}">
                        <IdentificacaoNfse>
                            <Numero>${nfseNumero}</Numero>
                            <CpfCnpj><Cnpj>${empresa.cnpj.replace(/\D/g, '')}</Cnpj></CpfCnpj>
                            <InscricaoMunicipal>${empresa.inscricaoMunicipal}</InscricaoMunicipal>
                            <CodigoMunicipio>${empresa.codigoMunicipio || '3509502'}</CodigoMunicipio>
                        </IdentificacaoNfse>
                        <CodigoCancelamento>${codigoCancelamento}</CodigoCancelamento>
                    </InfPedidoCancelamento>
                </Pedido>
            </CancelarNfseEnvio>
        `;

        const signedXml = this.signXml(strXml, 'InfPedidoCancelamento');
        const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:nfse="http://nfse.campinas.sp.gov.br/">
           <soapenv:Header/>
           <soapenv:Body>
              <nfse:CancelarNfse>
                 <nfse:xmlEnvio><![CDATA[${signedXml}]]></nfse:xmlEnvio>
              </nfse:CancelarNfse>
           </soapenv:Body>
        </soapenv:Envelope>`;

        return this.sendSoapRequest(soapEnvelope, 'CancelarNfse');
    }

    private wrapSoapEnvelope(xmlContent: string, action: string): string {
        return `<?xml version="1.0" encoding="utf-8"?>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:nfse="http://nfse.campinas.sp.gov.br/">
           <soapenv:Header/>
           <soapenv:Body>
              <nfse:${action}>
                 <nfse:xmlEnvio><![CDATA[${xmlContent}]]></nfse:xmlEnvio>
              </nfse:${action}>
           </soapenv:Body>
        </soapenv:Envelope>`;
    }

    private async sendSoapRequest(envelope: string, action: string) {
        try {
            const config = {
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': `http://nfse.campinas.sp.gov.br/${action}`
                }
            };
            const response = await axios.post(this.getEndpointUrl(), envelope, config);
            return this.parseSoapResponse(response.data);
        } catch (error: any) {
            console.error(`[Nfse Campinas] Falha na acao ${action}`, error?.response?.data || error);
            throw new Error(`Falha de Comunicação SOAP (${action})`);
        }
    }
}

// Handler de Assinatura do xml-crypto
class KeyInfo {
    constructor(private certificatePem: string) {}
    public getKeyInfo() {
        return `<X509Data><X509Certificate>${this.certificatePem}</X509Certificate></X509Data>`;
    }
    public getKey() { return undefined; }
}
